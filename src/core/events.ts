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
  /** The neighbourhood, when the coordinates came from somewhere that also knows it. */
  hood?: string;
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
  /** What happens here happens outdoors, April to October. 'summer' for a place with a shorter season (May to September). */
  outdoor?: boolean | 'summer';
  /** The curated place at this venue, so the event can borrow its nudge. */
  placeId?: string;
}

const FILLER =
  /\b(class(es)?|workshop|meeting|support group|webinar|virtual|zoom|online|info(rmation)? session|training|registration|fundrais\w+|yoga|meditation|advising|seminar|colloquium|grand rounds|drop-in|office hours|careers?|club|rehearsal|auditions?|blood drive|volunteer\w*|story ?time|worship|bingo|trivia|karaoke|happy hour|open house|tour|chess|game night|puzzle|stitch\S*|knitting|bring your own|clean-?up|adoptions?|one-on-one|run club|practice|clinic)\b/i;

// How a listing tells us it is outdoors or meant for families. These are read from the listing's own
// words, so they are kept strict: a film *about* a parade, or a play with children in it, is neither.
/** Says so outright. Trusted for any kind of event. */
const OUTDOORS = /\b(outdoors?|open[- ]air|al fresco|on the (capitol )?square|in the park|at the park|on the lawn|on the terrace|on the lake|rain or shine|weather permitting|bring (a |your )?(lawn )?(chair|blanket)s?)\b/i;
/** Things that only happen outside. Not trusted for films, plays, talks and readings, whose titles borrow these words. */
const OUTDOOR_THINGS = /\b(block party|street (fair|festival|party|dance)|parade|5k|10k|fun run|bike ride|hike|nature walk|birding|bird (walk|hike|count)|stargaz\w+|bonfire|fireworks|sledding|ice skating|snowshoe\w*|paddle|regatta)\b/i;
/** Says it is inside: the winter farmers' market, a rain location. That settles it. */
const INDOORS = /\b(indoors?|inside the|moved inside|rain location)\b/i;
/** Meant for children or for families, in so many words. */
const FOR_FAMILIES = /\b(family[- ]friendly|kid[- ]friendly|for (the whole |all )?(kids|children|families|family)|famil(y|ies) (show|concert|fun|day|night|event|matinee|dance|festival|program)|(kids'?|children'?s) (show|concert|matinee|program|theat(er|re)|festival|day|music|dance)|all[- ]ages (welcome|show|event)|fun for all ages|bring the kids|puppet show)\b/i;
const ALL_AGES = /\ball[- ]ages\b/i;
const ADULTS_ONLY = /\b(21\+|21 ?(and|&) ?(over|up|older)\b|18\+|18 ?(and|&) ?(over|up|older)\b|adults only\b|ages 21\b)/i;

const CANT_GO = /\b(sold out|cancel(l)?ed|postponed)\b/i;

const KINDS: { category: Category; label: string; re: RegExp; moods: Partial<Record<Mood, number>>; dropIn?: boolean; outdoor?: boolean }[] = [
  { category: 'market', label: 'Market', re: /\b(market|fair|festival|bazaar)\b/i, moods: { lively: 1, showoff: 0.6, eat: 0.6 }, dropIn: true },
  { category: 'talk', label: 'Reading', re: /\b(reading|author|poet(ry)?|book launch|in conversation|storytelling)\b/i, moods: { learn: 1, think: 0.6, date: 0.6 } },
  { category: 'talk', label: 'Talk', re: /\b(lecture|talk|panel)\b/i, moods: { learn: 1, think: 0.6 } },
  { category: 'show', label: 'Game', re: /\b(hockey|basketball|football|volleyball|soccer|baseball|roller derby|wrestling)\b/i, moods: { lively: 1, showoff: 0.6, kids: 0.6 } },
  { category: 'show', label: 'Film', re: /\b(film|screening|cinema|movie)\b/i, moods: { date: 0.6, cozy: 0.6, learn: 0.6 } },
  { category: 'show', label: 'Show', re: /\b(comedy|stand-?up|improv|theat(er|re)|dance|ballet|opera|burlesque|drag)\b/i, moods: { lively: 1, date: 0.6 } },
  // Nobody waits for the first act of an open mic or a jam: you turn up when you like.
  { category: 'music', label: 'Open mic', re: /\b(open mic|open[- ]mike|open jam|open stage|jam session|bluegrass jam|song circle)\b/i, moods: { lively: 1, date: 0.6 }, dropIn: true },
  { category: 'music', label: 'DJ night', re: /\bdjs?\b/i, moods: { lively: 1, drink: 0.6 }, dropIn: true },
  { category: 'music', label: 'Live music', re: /\b(concert|band|jazz|blues|quartet|trio|symphony|orchestra|songwriter|recital|choir|bluegrass|folk)\b/i, moods: { lively: 1, date: 0.6 } },
  // Last, so that a film or a play with one of these words in its title is still a film or a play.
  { category: 'trail', label: 'Outing', re: /\b(hike|nature walk|birding|bird (walk|hike|count)|ski|snowshoe\w*|ice skating|skating party|sledding|stargaz\w+|paddle|bike ride|full moon walk|candlelight)\b/i, moods: { nature: 1, move: 0.6 }, outdoor: true },
  { category: 'view', label: 'Outdoor event', re: /\b(fireworks|parade|bonfire|tree lighting|lantern)\b/i, moods: { showoff: 1, lively: 0.6, nature: 0.6, kids: 0.6 }, dropIn: true, outdoor: true },
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
  const here = venue ?? (raw.lat !== undefined && raw.lng !== undefined ? { lat: raw.lat, lng: raw.lng, hood: raw.hood ?? 'Campus' } : null);
  if (!here) return { dropped: 'unknown venue' };
  if (miles(here, center) > MAX_MILES) return { dropped: 'out of town' };
  const text = `${title} ${description} ${(raw.tags ?? []).join(' ')}`;
  if (CANT_GO.test(text)) return { dropped: 'sold out or cancelled' };
  if (!raw.preset && FILLER.test(text)) return { dropped: 'filler' };
  // Fall back on what the venue is known for, using the plainest label for it.
  // A cinema or a club is known for what it does: a title with "parade" in it there is still a film, not a parade.
  const kind = raw.preset ?? KINDS.find((k) => k.re.test(text) && !(k.outdoor && venue?.usual)) ?? [...KINDS].reverse().find((k) => k.category === venue?.usual);
  if (!kind) return { dropped: "can't tell what it is" };
  const end = raw.end && raw.end > raw.start ? raw.end : raw.start + (kind.category === 'music' ? 120 : 90) * MIN;
  const length = Math.round((end - raw.start) / MIN);
  // A venue's own program that runs for hours is a notice ("open late today"), not a thing to turn up for.
  if (length > 8 * 60 || (raw.preset && length > 180)) return { dropped: 'all-day listing' };
  const venueName = clean(raw.venue);
  // Outdoors: the venue is (a park, the square; the Terrace in summer), or the listing says so.
  const month = new Date(raw.start).getUTCMonth() + 1;
  // A park is where things happen outdoors from April to October. In the cold months what's listed there is as
  // likely in the shelter or the pavilion, so then the listing has to say it's outside (sledding, skating, a bonfire).
  const venueOut = (venue?.outdoor === true && month >= 4 && month <= 10) || (venue?.outdoor === 'summer' && month >= 5 && month <= 9);
  const staged = kind.label === 'Film' || kind.label === 'Show' || kind.label === 'Talk' || kind.label === 'Reading';
  const outdoors = !raw.preset && !INDOORS.test(text) && (venueOut || Boolean('outdoor' in kind && kind.outdoor) || OUTDOORS.test(text) || (!staged && OUTDOOR_THINGS.test(text)));
  // For families: the listing says so. For adults only: it says that, or it's a bar and says nothing.
  const adults = ADULTS_ONLY.test(text);
  const families = !adults && FOR_FAMILIES.test(text);
  const kids: Option['kids'] = raw.preset?.kids ?? (adults ? 0 : families ? 2 : ALL_AGES.test(text) ? 1 : venue?.bar ? 0 : 1);
  // An outdoor event is also an answer to "outside"; a family one to "kids". Neither is taken away from what it already was.
  const moods = { ...kind.moods, ...(outdoors ? { nature: Math.max(kind.moods.nature ?? 0, 0.6) } : {}), ...(families ? { kids: 1 } : {}) };
  return {
    option: {
      id: `${raw.source}:${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48)}:${raw.start / MIN}`,
      kind: 'event', name: title, what: `${kind.label} at ${venueName}`, category: kind.category, hood: here.hood,
      lat: here.lat, lng: here.lng,
      story: description ? blurb(description) : `${kind.label} at ${venueName}.`,
      price: raw.preset?.price ?? priceOf(description), setting: outdoors ? 'out' : 'in', minutes: [Math.min(45, length), length],
      kids,
      // A band in a bar plays for a couple of hours to whoever walks in; a concert hall wants you in your seat at the start.
      // A fair or a festival is worth more of a detour than a Tuesday gig.
      moods, gem: kind.category === 'market' ? 0.6 : 0.4, when: { start: raw.start, end },
      dropIn: ('dropIn' in kind ? kind.dropIn ?? false : false) || (kind.category === 'music' && Boolean(venue?.bar) && length >= 90),
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

const sameThing = (title: string, venue: string) => `${clean(title).toLowerCase()}|${clean(venue).toLowerCase()}`;

/**
 * Mark what is on once and once only. `listings` is everything the calendars
 * show, including the days past what we publish: a play on five nights is a
 * run, a jam every Tuesday turns up again next week, and neither is a one-off.
 * What is left is the thing that happens on a single day and then is gone.
 */
export function markOneOffs(options: Option[], listings: RawEvent[]): Option[] {
  const days = new Map<string, Set<number>>();
  for (const l of listings) {
    const key = sameThing(l.title, l.venue);
    days.set(key, (days.get(key) ?? new Set()).add(Math.floor((l.start - 6 * 3_600_000) / 86_400_000)));
  }
  return options.map((o) => ((days.get(sameThing(o.name, o.venue ?? ''))?.size ?? 0) === 1 ? { ...o, oneOff: true } : o));
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
