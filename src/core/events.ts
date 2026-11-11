// Turning raw listings from public calendars into options worth recommending.
// The filter is strict on purpose: an event gets through only if we know the
// venue, can tell what kind of thing it is, and it isn't calendar filler.
// Used by the fetch script (build time) and by the app (to validate the file).

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
  lat?: number;
  lng?: number;
  tags?: string[];
}

export interface Venue {
  /** Lowercase fragment matched against the venue name. */
  match: string;
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
  /\b(class(es)?|workshop|meeting|support group|webinar|virtual|zoom|online|info(rmation)? session|training|registration|fundrais\w+|yoga|meditation|advising|seminar|colloquium|grand rounds|drop-in|office hours|careers?|club|rehearsal|auditions?|blood drive|volunteer\w*|story ?time|worship|bingo|trivia|karaoke|happy hour|open house|tour)\b/i;

const CANT_GO = /\b(sold out|cancel(l)?ed|postponed)\b/i;

const KINDS: { category: Category; label: string; re: RegExp; moods: Partial<Record<Mood, number>>; dropIn?: boolean }[] = [
  { category: 'market', label: 'Market', re: /\b(market|fair|festival|bazaar)\b/i, moods: { lively: 1, showoff: 0.6, eat: 0.6 }, dropIn: true },
  { category: 'talk', label: 'Reading', re: /\b(reading|author|poet(ry)?|book launch|in conversation|storytelling)\b/i, moods: { learn: 1, think: 0.6, date: 0.6 } },
  { category: 'talk', label: 'Talk', re: /\b(lecture|talk|panel)\b/i, moods: { learn: 1, think: 0.6 } },
  { category: 'show', label: 'Film', re: /\b(film|screening|cinema|movie)\b/i, moods: { date: 0.6, cozy: 0.6, learn: 0.6 } },
  { category: 'show', label: 'Show', re: /\b(comedy|stand-?up|improv|theat(er|re)|dance|ballet|opera|burlesque|drag)\b/i, moods: { lively: 1, date: 0.6 } },
  { category: 'music', label: 'Live music', re: /\b(concert|band|jazz|blues|quartet|trio|symphony|orchestra|songwriter|open mic|recital|choir|bluegrass|folk)\b/i, moods: { lively: 1, date: 0.6 } },
];

export function clean(html: string): string {
  return html
    .replace(/&amp;/g, '&').replace(/&amp;/g, '&') // feeds double-encode
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#0?39;|&apos;|&rsquo;|&lsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ')
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
  const n = name.toLowerCase();
  return venues.find((v) => n.includes(v.match));
}

/** A recommendable option, or null — with no apology — if it doesn't make the cut. */
export function toOption(raw: RawEvent, venues: Venue[]): Option | null {
  const title = clean(raw.title);
  const description = clean(raw.description);
  const venue = findVenue(raw.venue, venues);
  if (!title || !venue || !Number.isFinite(raw.start)) return null;
  const text = `${title} ${description} ${(raw.tags ?? []).join(' ')}`;
  if (FILLER.test(text) || CANT_GO.test(text)) return null;
  // Fall back on what the venue is known for, using the plainest label for it.
  const kind = KINDS.find((k) => k.re.test(text)) ?? [...KINDS].reverse().find((k) => k.category === venue.usual);
  if (!kind) return null;
  const end = raw.end && raw.end > raw.start ? raw.end : raw.start + (kind.category === 'music' ? 120 : 90) * MIN;
  const length = Math.round((end - raw.start) / MIN);
  if (length > 8 * 60) return null; // an all-day listing, not an outing
  const venueName = clean(raw.venue);
  return {
    id: `${raw.source}:${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48)}:${raw.start / MIN}`,
    kind: 'event', name: title, what: `${kind.label} at ${venueName}`, category: kind.category, hood: venue.hood,
    lat: venue.lat, lng: venue.lng,
    story: description ? blurb(description) : `${kind.label} at ${venueName}.`,
    price: priceOf(description), setting: 'in', minutes: [Math.min(45, length), length], kids: venue.bar ? 0 : 1,
    moods: kind.moods, gem: 0.4, when: { start: raw.start, end }, dropIn: kind.dropIn ?? false,
    hoursTrust: 'solid', url: raw.url, source: raw.source, venue: venueName, placeId: venue.placeId,
  };
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
