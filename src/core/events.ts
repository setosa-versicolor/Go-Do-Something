// Turning raw listings from public calendars into options worth recommending.
// The filter is strict on purpose: an event gets through only if we know the
// venue, can tell what kind of thing it is, and it isn't calendar filler.
// Used by the fetch script (build time) and by the app (to validate the file).

import { miles, type LatLng } from './geo';
import { fromLocal, DAY, MIN } from './time';
import type { Category, Mood, Option } from './types';

export interface RawEvent {
  source: string;
  title: string;
  description: string;
  start: number;
  end?: number;
  venue: string;
  url: string;
  /** Coordinates from the feed itself, for venues we don't have on file. */
  lat?: number;
  lng?: number;
  tags?: string[];
  /**
   * Set by a source whose every listing is a known kind of thing at a known
   * place (a museum's own program calendar). Skips the guesswork, not the checks.
   */
  preset?: Pick<Option, 'category' | 'moods' | 'kids' | 'price'> & { label: string };
}

/** Human names for the calendars we read, shown on the link back to them. */
export const SOURCES: Record<string, string> = {
  isthmus: 'Isthmus',
  uw: 'UW–Madison',
  mcm: "Madison Children's Museum",
  osm: 'OpenStreetMap',
};

/** How far from the city centre an event with only raw coordinates may be. */
const MAX_MILES = 12;

export interface Venue {
  /** Lowercase fragment matched against the venue name. */
  match: string;
  /** The whole name must equal `match`. For short names that are also ordinary words. */
  exact?: boolean;
  lat: number;
  lng: number;
  hood: string;
  /** What usually happens here, when the listing itself doesn't say. */
  usual?: Category;
  /** A bar: fine for a date, not for kids. */
  bar?: boolean;
  /** The curated place at this venue, so the event can borrow its nudge. */
  placeId?: string;
}

const FILLER =
  /\b(class(es)?|workshop|meeting|support group|webinar|virtual|zoom|online|info(rmation)? session|training|registration|fundrais\w+|yoga|meditation|advising|seminar|colloquium|grand rounds|drop-in|office hours|careers?|club|rehearsal|auditions?|blood drive|volunteer\w*|story ?time|worship|bingo|trivia|karaoke|happy hour|open house|tour|chess|game night|puzzle|stitch\S*|knitting|bring your own|clean-?up|adoptions?|one-on-one|run club|practice)\b/i;

const CANT_GO = /\b(sold out|cancel(l)?ed|postponed)\b/i;

const KINDS: { category: Category; label: string; re: RegExp; moods: Partial<Record<Mood, number>>; dropIn?: boolean }[] = [
  { category: 'market', label: 'Market', re: /\b(market|fair|festival|bazaar)\b/i, moods: { lively: 1, showoff: 0.6, eat: 0.6 }, dropIn: true },
  { category: 'talk', label: 'Reading', re: /\b(reading|author|poet(ry)?|book launch|in conversation|storytelling)\b/i, moods: { learn: 1, think: 0.6, date: 0.6 } },
  { category: 'talk', label: 'Talk', re: /\b(lecture|talk|panel)\b/i, moods: { learn: 1, think: 0.6 } },
  { category: 'show', label: 'Game', re: /\b(hockey|basketball|football|volleyball|soccer|baseball|roller derby|wrestling)\b/i, moods: { lively: 1, showoff: 0.6, kids: 0.6 } },
  { category: 'show', label: 'Film', re: /\b(film|screening|cinema|movie)\b/i, moods: { date: 0.6, cozy: 0.6, learn: 0.6 } },
  { category: 'show', label: 'Show', re: /\b(comedy|stand-?up|improv|theat(er|re)|dance|ballet|opera|burlesque|drag)\b/i, moods: { lively: 1, date: 0.6 } },
  { category: 'music', label: 'DJ night', re: /\bdjs?\b/i, moods: { lively: 1, drink: 0.6 } },
  { category: 'music', label: 'Live music', re: /\b(concert|band|jazz|blues|quartet|trio|symphony|orchestra|songwriter|open mic|recital|choir|bluegrass|folk)\b/i, moods: { lively: 1, date: 0.6 } },
];

export function clean(html: string): string {
  return html
    .replace(/&amp;/g, '&').replace(/&amp;/g, '&') // feeds double-encode
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#0?39;|&apos;|&rsquo;|&lsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ')
    .replace(/^@ /, '')
    .trim();
}

/** The first sentence or two, never cut mid-word. */
function blurb(text: string, max = 220): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return stop > 60 ? cut.slice(0, stop + 1) : cut.slice(0, cut.lastIndexOf(' ')) + '…';
}

function priceOf(text: string): Option['price'] {
  const dollars = /\$\s?(\d+)/.exec(text);
  if (dollars) return Number(dollars[1]) <= 15 ? 1 : Number(dollars[1]) <= 40 ? 2 : 3;
  return /\bfree\b/i.test(text) ? 0 : 1;
}

export function findVenue(name: string, venues: Venue[]): Venue | undefined {
  const n = name.toLowerCase().trim();
  return venues.find((v) => (v.exact ? n === v.match : n.includes(v.match)));
}

export type Verdict = { option: Option } | { dropped: string };

/**
 * Judge one listing. It becomes a recommendable option only if we know where
 * it is, can tell what kind of thing it is, and it isn't calendar filler.
 * Otherwise it's dropped, with the reason, so the fetch log can be read.
 */
export function judge(raw: RawEvent, venues: Venue[], center: LatLng): Verdict {
  const title = clean(raw.title);
  const description = clean(raw.description);
  if (!title || !Number.isFinite(raw.start)) return { dropped: 'malformed' };
  const venue = findVenue(raw.venue, venues);
  const here = venue ?? (raw.lat !== undefined && raw.lng !== undefined ? { lat: raw.lat, lng: raw.lng, hood: 'Campus' } : null);
  if (!here) return { dropped: 'unknown venue' };
  if (miles(here, center) > MAX_MILES) return { dropped: 'out of town' };
  const text = `${title} ${description} ${(raw.tags ?? []).join(' ')}`;
  if (CANT_GO.test(text)) return { dropped: 'sold out or cancelled' };
  if (!raw.preset && FILLER.test(text)) return { dropped: 'filler' };
  // Fall back on what the venue is known for, using the plainest label for it.
  const kind = raw.preset ?? KINDS.find((k) => k.re.test(text)) ?? [...KINDS].reverse().find((k) => k.category === venue?.usual);
  if (!kind) return { dropped: "can't tell what it is" };
  const end = raw.end && raw.end > raw.start ? raw.end : raw.start + (kind.category === 'music' ? 120 : 90) * MIN;
  const length = Math.round((end - raw.start) / MIN);
  // A venue's own program that runs for hours is a notice ("open late today"), not a thing to turn up for.
  if (length > 8 * 60 || (raw.preset && length > 180)) return { dropped: 'all-day listing' };
  const venueName = clean(raw.venue);
  return {
    option: {
      id: `${raw.source}:${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48)}:${raw.start / MIN}`,
      kind: 'event', name: title, what: `${kind.label} at ${venueName}`, category: kind.category, hood: here.hood,
      lat: here.lat, lng: here.lng,
      story: description ? blurb(description) : `${kind.label} at ${venueName}.`,
      price: raw.preset?.price ?? priceOf(description), setting: 'in', minutes: [Math.min(45, length), length],
      kids: raw.preset?.kids ?? (venue?.bar ? 0 : 1),
      moods: kind.moods, gem: 0.4, when: { start: raw.start, end }, dropIn: 'dropIn' in kind ? kind.dropIn ?? false : false,
      hoursTrust: 'solid', url: raw.url, source: raw.source, venue: venueName, placeId: venue?.placeId,
    },
  };
}

/** `judge`, for callers that only want the option. */
export function toOption(raw: RawEvent, venues: Venue[], center: LatLng): Option | null {
  const v = judge(raw, venues, center);
  return 'option' in v ? v.option : null;
}

/**
 * The same show from two calendars is one show: same start, same spot.
 * Earlier sources win, so list the best-written calendar first.
 */
export function dedupe(options: Option[]): Option[] {
  const kept: Option[] = [];
  for (const o of options) {
    const twin = kept.some((k) => k.when!.start === o.when!.start && (miles(k, o) < 0.06 || k.name.toLowerCase() === o.name.toLowerCase()));
    if (!twin) kept.push(o);
  }
  return kept;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function clock12(s: string): number {
  const m = /(\d{1,2}):(\d{2}) ([AP])M/.exec(s)!;
  return (Number(m[1]) % 12) * 60 + Number(m[2]) + (m[3] === 'P' ? 720 : 0);
}

/**
 * Isthmus puts everything in the title:
 * "Salsa Dance - Nov 10, 2026 7:30 PM - 10:30 PM @ Cafe Coda".
 * Times are city wall time, so they're resolved in the city's zone.
 */
export function parseIsthmusTitle(title: string, tz: string): Pick<RawEvent, 'title' | 'start' | 'end' | 'venue'> | null {
  const m = /^(.*) - ([A-Z][a-z]{2}) (\d{1,2}), (\d{4}) (\d{1,2}:\d{2} [AP]M)(?: - (\d{1,2}:\d{2} [AP]M))? @ (.+)$/.exec(clean(title));
  if (!m) return null;
  const mo = MONTHS.indexOf(m[2]!.toLowerCase()) + 1;
  if (mo === 0) return null;
  const startMin = clock12(m[5]!);
  const start = fromLocal(Number(m[4]), mo, Number(m[3]), startMin, tz);
  let end: number | undefined;
  if (m[6]) {
    let endMin = clock12(m[6]);
    if (endMin <= startMin) endMin += 1440; // ends after midnight
    end = fromLocal(Number(m[4]), mo, Number(m[3]), endMin, tz);
  }
  return { title: m[1]!, start, end, venue: m[7]! };
}

export interface EventFile {
  generatedAt: number;
  sources: Record<string, number>;
  events: Option[];
}

export const STALE_AFTER = 4 * DAY;

/**
 * Validate the fetched events file on the device. A file too old to trust, or
 * an entry that's malformed or already over, is dropped rather than shown.
 */
export function loadEvents(json: unknown, now: number): Option[] {
  const file = json as Partial<EventFile> | null;
  if (!file || typeof file.generatedAt !== 'number' || !Array.isArray(file.events)) return [];
  if (now - file.generatedAt > STALE_AFTER) return [];
  return file.events.filter(
    (e) =>
      e && e.kind === 'event' && typeof e.id === 'string' && typeof e.name === 'string' && typeof e.story === 'string' &&
      typeof e.lat === 'number' && typeof e.lng === 'number' && Array.isArray(e.minutes) && e.moods && typeof e.moods === 'object' &&
      e.when && typeof e.when.start === 'number' && typeof e.when.end === 'number' && e.when.end > now,
  );
}
