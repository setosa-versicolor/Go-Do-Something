// Fetch the next week of events from public calendars, keep only what's worth
// recommending, and write public/events.json. Run by the deploy workflow on a
// schedule; safe to run by hand (`npm run events`).
//
// If every source fails, the old file is left alone and the script exits
// non-zero: the app ignores a file more than four days old.

import { writeFileSync } from 'node:fs';
import { city, venues } from '../src/cities/madison';
import { clean, parseIsthmusTitle, toOption, type EventFile, type RawEvent } from '../src/core/events';
import { DAY, localDatePlus } from '../src/core/time';
import type { Option } from '../src/core/types';

const now = Date.now();
const HORIZON = 8 * DAY;
const UA = { 'user-agent': 'go-do-something events fetcher' };

async function get(url: string): Promise<string> {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

/** Isthmus calendar RSS: paged, soonest first. */
async function isthmus(): Promise<RawEvent[]> {
  const out: RawEvent[] = [];
  const seen = new Set<string>();
  for (let page = 1; page <= 12; page++) {
    const xml = await get(`https://isthmus.com/search/event/calendar-of-events/index.rss?page=${page}`);
    const items = xml.split('<item>').slice(1);
    let fresh = 0;
    let latest = 0;
    for (const item of items) {
      const tag = (t: string) => new RegExp(`<${t}>([\\s\\S]*?)</${t}>`).exec(item)?.[1]?.replace(/^<!\[CDATA\[|\]\]>$/g, '') ?? '';
      const link = clean(tag('link'));
      const parsed = parseIsthmusTitle(tag('title'), city.tz);
      if (!parsed || !link || seen.has(link)) continue;
      seen.add(link);
      fresh++;
      latest = Math.max(latest, parsed.start);
      out.push({ source: 'isthmus', description: tag('description'), url: link, ...parsed });
    }
    if (fresh === 0 || latest > now + HORIZON) break;
  }
  return out;
}

/** UW–Madison events calendar: one JSON document per day. */
async function uw(): Promise<RawEvent[]> {
  const out: RawEvent[] = [];
  for (let n = 0; n < 7; n++) {
    const d = localDatePlus(now, n, city.tz);
    const day = `${d.y}-${String(d.mo).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    const list = JSON.parse(await get(`https://today.wisc.edu/events/day/${day}.json`)) as Record<string, any>[];
    for (const e of list) {
      if (e.allDayEvent || !e.startDateUnix || !e.building?.name) continue;
      out.push({
        source: 'uw', title: String(e.title ?? ''), description: String(e.description ?? ''),
        start: e.startDateUnix * 1000, end: e.endDateUnix ? e.endDateUnix * 1000 : undefined,
        venue: `${e.location ?? ''} ${e.building.name}`, url: `https://today.wisc.edu/events/view/${e.id}`,
        tags: Array.isArray(e.tags) ? e.tags : [],
      });
    }
  }
  return out;
}

const sources: Record<string, () => Promise<RawEvent[]>> = { isthmus, uw };
const counts: Record<string, number> = {};
const events = new Map<string, Option>();
let failures = 0;

for (const [name, fetchSource] of Object.entries(sources)) {
  try {
    const raw = await fetchSource();
    let kept = 0;
    for (const r of raw) {
      if (r.start < now - DAY || r.start > now + HORIZON) continue;
      const option = toOption(r, venues);
      if (!option) continue;
      // The same show listed twice (or on both calendars) is one show.
      const key = `${option.name.toLowerCase()}|${option.when!.start}`;
      if (!events.has(key)) (events.set(key, option), kept++);
    }
    counts[name] = kept;
    console.log(`${name}: ${raw.length} listed, ${kept} kept`);
  } catch (err) {
    failures++;
    console.error(`${name}: FAILED — ${(err as Error).message}`);
  }
}

if (failures === Object.keys(sources).length) {
  console.error('Every source failed; leaving the existing events.json untouched.');
  process.exit(1);
}

const file: EventFile = { generatedAt: now, sources: counts, events: [...events.values()].sort((a, b) => a.when!.start - b.when!.start) };
writeFileSync(new URL('../public/events.json', import.meta.url), JSON.stringify(file, null, 1) + '\n');
console.log(`wrote ${file.events.length} events`);
