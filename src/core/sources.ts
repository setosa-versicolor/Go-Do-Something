// One small parser per calendar: raw text in, RawEvents out. Pure, so each can
// be tested against a saved sample. Fetching lives in scripts/fetch-events.ts;
// judging what's worth keeping lives in events.ts.
//
// To add a calendar: write a parser here, add a test with a real sample, add
// its name to SOURCES in events.ts, and list it in the fetch script.

import { clean, parseIsthmusTitle, type RawEvent } from './events';

/** Isthmus calendar RSS. Title carries name, time and venue. */
export function parseIsthmus(xml: string, tz: string): RawEvent[] {
  const out: RawEvent[] = [];
  for (const item of xml.split('<item>').slice(1)) {
    const tag = (t: string) => new RegExp(`<${t}>([\\s\\S]*?)</${t}>`).exec(item)?.[1]?.replace(/^<!\[CDATA\[|\]\]>$/g, '') ?? '';
    const url = clean(tag('link'));
    const parsed = parseIsthmusTitle(tag('title'), tz);
    if (parsed && url) out.push({ source: 'isthmus', description: tag('description'), url, ...parsed });
  }
  return out;
}

/**
 * UW–Madison events, as returned by today.wisc.edu/events/tag/<tag>.json.
 * Times are true instants and buildings carry coordinates, so campus venues
 * don't need to be in our venue table.
 */
export function parseUw(json: unknown): RawEvent[] {
  if (!Array.isArray(json)) return [];
  const out: RawEvent[] = [];
  for (const e of json as Record<string, any>[]) {
    const at = e?.building?.latlng;
    if (!e || e.allDayEvent || typeof e.startDateUnix !== 'number' || !e.building?.name) continue;
    if (e.virtual_url && !e.location) continue;
    out.push({
      source: 'uw', title: String(e.title ?? ''), description: String(e.description ?? ''),
      start: e.startDateUnix * 1000, end: typeof e.endDateUnix === 'number' ? e.endDateUnix * 1000 : undefined,
      venue: String(e.building.name), url: `https://today.wisc.edu/events/view/${e.id}`,
      lat: Array.isArray(at) ? Number(at[0]) : undefined, lng: Array.isArray(at) ? Number(at[1]) : undefined,
      tags: Array.isArray(e.tags) ? e.tags.map(String) : [],
    });
  }
  return out;
}

function utc(s: unknown): number {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(String(s ?? ''));
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5])) : NaN;
}

/**
 * Any site running The Events Calendar (WordPress): /wp-json/tribe/events/v1/events.
 * We read the UTC fields, never the zoneless local ones. `fixed` is for a
 * venue's own calendar, where every event is at that venue.
 */
export function parseTribe(json: unknown, source: string, fixed?: Pick<RawEvent, 'venue' | 'preset'>): RawEvent[] {
  const events = (json as { events?: unknown } | null)?.events;
  if (!Array.isArray(events)) return [];
  const out: RawEvent[] = [];
  for (const e of events as Record<string, any>[]) {
    const start = utc(e?.utc_start_date);
    const end = utc(e?.utc_end_date);
    const venue = fixed?.venue ?? (e?.venue && !Array.isArray(e.venue) ? String(e.venue.venue ?? '') : '');
    if (!e || e.all_day || Number.isNaN(start) || !venue) continue;
    out.push({
      source, title: String(e.title ?? ''), description: `${e.description ?? ''} ${e.cost ?? ''}`, start,
      end: end > start ? end : undefined, venue, url: String(e.url ?? ''),
      tags: Array.isArray(e.categories) ? e.categories.map((c: any) => String(c?.name ?? '')) : [], preset: fixed?.preset,
    });
  }
  return out;
}
