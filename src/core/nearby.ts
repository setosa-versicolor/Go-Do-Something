// The second tier: ordinary places from OpenStreetMap, used only to fill the
// gap when the hand-written list has nothing in reach. We know where each one
// is and the hours the map gives for it, and we claim nothing else: no story,
// no nudge, and always "usually open".

import { parseHours } from './hours';
import type { Category, Mood, Option } from './types';

/** One place as stored in nearby.json: as small as it can be, expanded on the device. */
export interface NearbyRow {
  id: string;
  n: string; // name
  w: string; // what it is
  c: Category;
  lat: number;
  lng: number;
  h: string; // hours, in our syntax
  hood: string;
  url?: string;
}

export interface NearbyFile {
  generatedAt: number;
  places: NearbyRow[];
}

const DAYS = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'];

/**
 * Turn an OpenStreetMap `opening_hours` value into our hours syntax, or null
 * if it uses anything we can't represent exactly (months, holidays with
 * hours, sunrise, week numbers). Better to leave a place out than to guess.
 * In OSM a later rule replaces an earlier one for the days it names.
 */
export function osmHours(spec: string): string | null {
  const s = spec.trim();
  if (!s) return null;
  if (s === '24/7') return 'daily 00:00-24:00';
  const week = new Map<string, string>();
  for (const raw of s.split(';')) {
    const rule = raw.trim();
    if (!rule) continue;
    if (/^PH\b/i.test(rule)) {
      if (/\b(off|closed)$/i.test(rule)) continue; // closed on holidays: we can't know the holidays, and it only errs toward caution elsewhere
      return null;
    }
    const m = /^((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:\s*[-,]\s*(?:Mo|Tu|We|Th|Fr|Sa|Su))*)?\s*(off|closed|\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}(?:\s*,\s*\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})*)$/i.exec(rule);
    if (!m) return null;
    const days = expandDays((m[1] ?? 'Mo-Su').toLowerCase().replace(/\s+/g, ''));
    if (!days) return null;
    const times = m[2]!.toLowerCase().replace(/\s+/g, '');
    for (const d of days) {
      if (times === 'off' || times === 'closed') week.delete(d);
      else week.set(d, times);
    }
  }
  if (week.size === 0) return null;
  // Group days that share hours, to keep the file small.
  const groups = new Map<string, string[]>();
  for (const d of DAYS) if (week.has(d)) groups.set(week.get(d)!, [...(groups.get(week.get(d)!) ?? []), d]);
  const out = [...groups].map(([times, days]) => `${days.length === 7 ? 'daily' : days.join(',')} ${times}`).join('; ');
  try {
    if (parseHours(out).flat().length === 0) return null;
  } catch {
    return null;
  }
  return out;
}

function expandDays(spec: string): string[] | null {
  const out: string[] = [];
  for (const part of spec.split(',')) {
    const [a, b] = part.split('-');
    const from = DAYS.indexOf(a ?? '');
    const to = b === undefined ? from : DAYS.indexOf(b);
    if (from < 0 || to < 0) return null;
    for (let i = from; ; i = (i + 1) % 7) {
      out.push(DAYS[i]!);
      if (i === to) break;
    }
  }
  return out;
}

const KIND: Record<string, { c: Category; noun: string }> = {
  restaurant: { c: 'food', noun: 'restaurant' },
  cafe: { c: 'cafe', noun: 'Café' },
  bar: { c: 'bar', noun: 'Bar' },
  pub: { c: 'bar', noun: 'Pub' },
  ice_cream: { c: 'treat', noun: 'Ice cream' },
  bakery: { c: 'treat', noun: 'Bakery' },
};

const words = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/, (c) => c.toUpperCase());

/** One OpenStreetMap element → a row, or null if it's a chain, unnamed, or has no usable hours. */
export function nearbyRow(el: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }, hood: string): NearbyRow | null {
  const t = el.tags ?? {};
  const kind = KIND[t.amenity ?? ''] ?? (t.shop === 'bakery' ? KIND.bakery : undefined);
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (!kind || !t.name || lat === undefined || lng === undefined) return null;
  if (t.brand || t['brand:wikidata'] || t.access === 'private' || t.disused === 'yes') return null;
  const h = osmHours(t.opening_hours ?? '');
  if (!h) return null;
  const cuisine = (t.cuisine ?? '').split(';').map((c) => c.trim()).filter((c) => c && c !== 'regional' && c !== 'coffee_shop').slice(0, 2).map(words);
  const w = kind.c === 'food' ? (cuisine.length ? `${cuisine.join(' and ')} restaurant` : 'Restaurant') : kind.noun;
  const site = t.website ?? t['contact:website'];
  return {
    id: `osm-${el.type[0]}${el.id}`, n: t.name, w, c: kind.c, lat: Math.round(lat * 1e5) / 1e5, lng: Math.round(lng * 1e5) / 1e5, h, hood,
    ...(site && /^https?:\/\//.test(site) ? { url: site } : {}),
  };
}

const SHAPE: Record<string, { moods: Partial<Record<Mood, number>>; price: 0 | 1 | 2 | 3; minutes: [number, number]; kids: 0 | 1 | 2 }> = {
  food: { moods: { eat: 1 }, price: 2, minutes: [40, 75], kids: 1 },
  cafe: { moods: { eat: 0.6, cozy: 0.6, think: 0.6 }, price: 1, minutes: [25, 60], kids: 1 },
  bar: { moods: { drink: 1, lively: 0.6 }, price: 2, minutes: [40, 80], kids: 0 },
  treat: { moods: { eat: 0.6, kids: 0.6 }, price: 1, minutes: [15, 30], kids: 2 },
};

export const MAP_STORY = "This one is from the map, not from my list. I know where it is and when it says it's open, and that is all I'll claim.";

/** Validate the fetched file on the device and expand it into options. Anything malformed is dropped. */
export function loadNearby(json: unknown): Option[] {
  const file = json as Partial<NearbyFile> | null;
  if (!file || !Array.isArray(file.places)) return [];
  const out: Option[] = [];
  for (const r of file.places) {
    const shape = r && SHAPE[r.c];
    if (!shape || typeof r.id !== 'string' || typeof r.n !== 'string' || typeof r.lat !== 'number' || typeof r.lng !== 'number' || typeof r.h !== 'string') continue;
    try {
      parseHours(r.h);
    } catch {
      continue;
    }
    out.push({
      id: r.id, kind: 'place', name: r.n, what: String(r.w ?? ''), category: r.c, hood: String(r.hood ?? ''), lat: r.lat, lng: r.lng,
      story: MAP_STORY, ...shape, setting: 'in', gem: 0, rules: [{ hours: r.h }], dropIn: true, hoursTrust: 'unverified', source: 'osm',
      ...(typeof r.url === 'string' && /^https?:\/\//.test(r.url) ? { url: r.url } : {}),
    });
  }
  return out;
}
