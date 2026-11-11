// The events process. Run every morning by the deploy workflow, and by hand
// with `npm run events` (add --dry to see what would be kept without writing).
//
//   fetch each calendar → parse (src/core/sources.ts) → judge each listing
//   (src/core/events.ts) → drop duplicates → write public/events.json
//
// A calendar that fails is skipped and reported; the rest still publish. If
// every calendar fails the old file is left alone and the script exits
// non-zero. The app ignores a file more than four days old.

import { writeFileSync } from 'node:fs';
import { city, venues } from '../src/cities/madison';
import { dedupe, judge, SOURCES, type EventFile, type RawEvent } from '../src/core/events';
import { parseIsthmus, parseTribe, parseUw } from '../src/core/sources';
import { DAY } from '../src/core/time';
import type { Option } from '../src/core/types';

const now = Date.now();
const HORIZON = 8 * DAY;
const dry = process.argv.includes('--dry');

async function get(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'user-agent': 'go-do-something events fetcher' }, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

// Order matters: when two calendars list the same show, the earlier one is kept.
const sources: Record<keyof typeof SOURCES, () => Promise<RawEvent[]>> = {
  /** Paged, soonest first; stop once we're past the horizon. */
  async isthmus() {
    const out: RawEvent[] = [];
    const seen = new Set<string>();
    for (let page = 1; page <= 12; page++) {
      const fresh = parseIsthmus(await get(`https://isthmus.com/search/event/calendar-of-events/index.rss?page=${page}`), city.tz).filter((e) => !seen.has(e.url));
      for (const e of fresh) seen.add(e.url);
      out.push(...fresh);
      if (fresh.length === 0 || Math.max(...fresh.map((e) => e.start)) > now + HORIZON) break;
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

const counts: Record<string, number> = {};
const kept: Option[] = [];
let failures = 0;

for (const [name, fetchSource] of Object.entries(sources)) {
  try {
    const raw = (await fetchSource()).filter((r) => r.start > now - DAY && r.start < now + HORIZON);
    const dropped = new Map<string, number>();
    const before = kept.length;
    for (const r of raw) {
      const verdict = judge(r, venues, city.center);
      if ('option' in verdict) kept.push(verdict.option);
      else dropped.set(verdict.dropped, (dropped.get(verdict.dropped) ?? 0) + 1);
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

const events = dedupe(kept).sort((a, b) => a.when!.start - b.when!.start);
console.log(`${events.length} events after removing ${kept.length - events.length} duplicates`);
if (!dry) {
  const file: EventFile = { generatedAt: now, sources: counts, events };
  writeFileSync(new URL('../public/events.json', import.meta.url), JSON.stringify(file, null, 1) + '\n');
}
