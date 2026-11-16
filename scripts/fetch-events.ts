// The events process. Run every morning by the deploy workflow, and by hand
// with `npm run events` (add --dry to see what would be kept without writing,
// and --venues to list the venues whose listings were dropped as unknown).
//
//   fetch each calendar → parse (src/core/sources.ts) → judge each listing
//   (src/core/events.ts) → drop duplicates → write public/events.json
//
// A calendar that fails is skipped and reported; the rest still publish. If
// every calendar fails the old file is left alone and the script exits
// non-zero. The app ignores a file more than four days old.

import { writeFileSync } from 'node:fs';
import { city, venues } from '../src/cities/madison';
import { clean, dedupe, judge, markOneOffs, SOURCES, type EventFile, type RawEvent } from '../src/core/events';
import { miles } from '../src/core/geo';
import { parseIsthmus, parseTribe, parseUw } from '../src/core/sources';
import { DAY } from '../src/core/time';
import type { Option } from '../src/core/types';

const now = Date.now();
const HORIZON = 8 * DAY;
/** How far ahead we read, to tell a one-off from a run or a weekly night. Nothing past HORIZON is published. */
const LOOKAHEAD = 15 * DAY;
/** Everything the calendars showed, published or not. */
const everything: RawEvent[] = [];
const dry = process.argv.includes('--dry');
/** --venues: list the venues we dropped listings for, busiest first, so the next ones to add are obvious. */
const listVenues = process.argv.includes('--venues');
const strangers = new Map<string, { n: number; sample: string; url: string }>();

async function get(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'user-agent': 'do-something-madison events fetcher' }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

// Order matters: when two calendars list the same show, the earlier one is kept.
const sources: Record<keyof typeof SOURCES, () => Promise<RawEvent[]>> = {
  /** Paged, soonest first; stop once we're past the horizon. */
  async isthmus() {
    const out: RawEvent[] = [];
    const seen = new Set<string>();
    for (let page = 1; page <= 36; page++) {
      const fresh = parseIsthmus(await get(`https://isthmus.com/search/event/calendar-of-events/index.rss?page=${page}`), city.tz).filter((e) => !seen.has(e.url));
      for (const e of fresh) seen.add(e.url);
      out.push(...fresh);
      if (fresh.length === 0 || Math.max(...fresh.map((e) => e.start)) > now + LOOKAHEAD) break;
    }
    return out;
  },
  /** Campus events by tag. This also carries the Wisconsin Union's films and concerts. */
  async uw() {
    const out: RawEvent[] = [];
    for (const tag of ['music', 'concerts', 'film', 'theater', 'dance', 'performance']) {
      out.push(...parseUw(JSON.parse(await get(`https://today.wisc.edu/events/tag/${tag}.json`))));
    }
    return out;
  },
  /** The museum's own programs. All at the museum, all for kids, all included with admission. */
  async mcm() {
    const json = JSON.parse(await get('https://madisonchildrensmuseum.org/wp-json/tribe/events/v1/events?per_page=50&start_date=now'));
    return parseTribe(json, 'mcm', {
      venue: "Madison Children's Museum",
      preset: { label: 'Kids’ program', category: 'play', moods: { kids: 1, cozy: 0.6 }, kids: 2, price: 2 },
    });
  },
};

const WORTH_FINDING = /\b(fair|festival|fest|parade|block party|street (party|dance)|market|fireworks|5k|fun run|concerts? (on|in) the)\b/i;

/** Coordinates from an Isthmus listing page, and the neighbourhood of the nearest venue we know. */
async function whereIs(url: string): Promise<{ lat: number; lng: number; hood: string } | null> {
  try {
    const page = await get(url);
    const lat = Number(/latitude" content="([-\d.]+)"/.exec(page)?.[1]);
    const lng = Number(/longitude" content="([-\d.]+)"/.exec(page)?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
    await new Promise((r) => setTimeout(r, 250));
    const near = venues.map((v) => ({ v, d: miles(v, { lat, lng }) })).sort((a, b) => a.d - b.d)[0];
    return { lat, lng, hood: near && near.d < 0.6 ? near.v.hood : /"addressLocality">([^<]*)</.exec(page)?.[1] ?? city.name };
  } catch {
    return null;
  }
}

const counts: Record<string, number> = {};
const kept: Option[] = [];
let failures = 0;

for (const [name, fetchSource] of Object.entries(sources)) {
  try {
    const fetched = await fetchSource();
    everything.push(...fetched);
    const raw = fetched.filter((r) => r.start > now - DAY && r.start < now + HORIZON);
    const dropped = new Map<string, number>();
    const before = kept.length;
    for (const r of raw) {
      let verdict = judge(r, venues, city.center);
      // A fair, a parade or a street festival is held on a street or a lot, not at a venue we'd have on file.
      // Those are exactly the listings worth having, so look up where it is from its own page.
      if ('dropped' in verdict && verdict.dropped === 'unknown venue' && WORTH_FINDING.test(`${r.title} ${clean(r.description)}`) && r.url.includes('isthmus.com')) {
        const at = await whereIs(r.url);
        if (at) verdict = judge({ ...r, ...at }, venues, city.center);
      }
      if ('option' in verdict) kept.push(verdict.option);
      else {
        dropped.set(verdict.dropped, (dropped.get(verdict.dropped) ?? 0) + 1);
        if (verdict.dropped === 'unknown venue') {
          const v = r.venue.trim() || '(no venue given)';
          strangers.set(v, { n: (strangers.get(v)?.n ?? 0) + 1, sample: r.title, url: r.url });
        }
      }
    }
    counts[name] = kept.length - before;
    const why = [...dropped].sort((a, b) => b[1] - a[1]).map(([reason, n]) => `${n} ${reason}`).join(', ');
    console.log(`${SOURCES[name]}: ${raw.length} this week, ${counts[name]} kept${why ? ` (dropped: ${why})` : ''}`);
  } catch (err) {
    failures++;
    console.error(`${SOURCES[name]}: FAILED — ${(err as Error).message}`);
  }
}

if (failures === Object.keys(sources).length) {
  console.error('Every source failed; leaving the existing events.json untouched.');
  process.exit(1);
}

if (listVenues) {
  // Isthmus event pages carry the venue's address and coordinates, so each
  // line below is ready to paste into the city's venues.ts once you've decided
  // the venue belongs there.
  console.log('\nVenues not in the list, by listings this week:');
  for (const [v, { n, sample, url }] of [...strangers].sort((a, b) => b[1].n - a[1].n)) {
    let where = '';
    if (url.includes('isthmus.com')) {
      try {
        const page = await get(url);
        const lat = /latitude" content="([-\d.]+)"/.exec(page)?.[1];
        const lng = /longitude" content="([-\d.]+)"/.exec(page)?.[1];
        const street = /"streetAddress">([^<]*)</.exec(page)?.[1] ?? '';
        const town = /"addressLocality">([^<]*)</.exec(page)?.[1] ?? '';
        if (lat && lng) where = `lat: ${Number(lat).toFixed(4)}, lng: ${Number(lng).toFixed(4)}  (${street}, ${town})`;
        await new Promise((r) => setTimeout(r, 250));
      } catch {
        where = '(page not readable)';
      }
    }
    console.log(`${String(n).padStart(4)}  ${v}  |  ${where}  |  e.g. ${sample.slice(0, 50)}`);
  }
  console.log('');
}

const events = markOneOffs(dedupe(kept), everything).sort((a, b) => a.when!.start - b.when!.start);
console.log(`${events.length} events after removing ${kept.length - events.length} duplicates: ${events.filter((e) => e.oneOff).length} one-offs, ${events.filter((e) => e.setting === 'out').length} outdoors, ${events.filter((e) => e.kids === 2).length} for families`);
if (!dry) {
  const file: EventFile = { generatedAt: now, sources: counts, events };
  writeFileSync(new URL('../public/events.json', import.meta.url), JSON.stringify(file, null, 1) + '\n');
}
