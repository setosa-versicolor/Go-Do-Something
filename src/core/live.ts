// What is going on outside right now, beyond the forecast: official weather
// alerts, the air, and the odd night the northern lights might show. All from
// free public feeds, called straight from the browser, each one optional.
// Unknown is never yes: a feed that fails is null, and nothing is claimed from it.

import type { LatLng } from './geo';
import { moonNearFull } from './moon';
import type { Sun } from './sun';
import { HOUR, MIN, fmtTime } from './time';
import { conditionsFor, hourAt, skyLook, type Weather } from './weather';

export interface Alert {
  /** The Weather Service's own name for it: "Winter Storm Warning". */
  event: string;
  from: number;
  until: number;
}

export interface Live {
  /** Null = we couldn't ask. An empty list = we asked, and there are none. */
  alerts: Alert[] | null;
  /** US air quality index by the hour. */
  air: { t: number; aqi: number }[] | null;
  /** Planetary K index, in three-hour steps: how disturbed the earth's magnetic field is forecast to be. */
  kp: { t: number; kp: number }[] | null;
}

export const NO_LIVE: Live = { alerts: null, air: null, kp: null };

export const alertsUrl = (at: LatLng) => `https://api.weather.gov/alerts/active?point=${at.lat.toFixed(4)},${at.lng.toFixed(4)}`;
export const airUrl = (at: LatLng) =>
  `https://air-quality-api.open-meteo.com/v1/air-quality?${new URLSearchParams({ latitude: String(at.lat), longitude: String(at.lng), hourly: 'us_aqi', timeformat: 'unixtime', forecast_days: '3' })}`;
export const KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json';

export function parseAlerts(json: unknown): Alert[] | null {
  const features = (json as { features?: unknown } | null)?.features;
  if (!Array.isArray(features)) return null;
  const out: Alert[] = [];
  for (const f of features) {
    const p = (f as { properties?: Record<string, unknown> } | null)?.properties;
    if (!p || typeof p.event !== 'string') continue;
    // A test message or a cancellation is not weather.
    if (p.status !== 'Actual' || p.messageType === 'Cancel') continue;
    const from = Date.parse(String(p.onset ?? p.effective ?? ''));
    const until = Date.parse(String(p.ends ?? p.expires ?? ''));
    if (Number.isNaN(from) || Number.isNaN(until)) continue;
    out.push({ event: p.event, from, until });
  }
  return out;
}

export function parseAir(json: unknown): Live['air'] {
  const h = (json as { hourly?: { time?: unknown; us_aqi?: unknown } } | null)?.hourly;
  if (!h || !Array.isArray(h.time) || !Array.isArray(h.us_aqi) || h.time.length !== h.us_aqi.length) return null;
  const aqi = h.us_aqi as unknown[];
  return (h.time as number[]).flatMap((s, i) => (typeof aqi[i] === 'number' ? [{ t: s * 1000, aqi: aqi[i] as number }] : []));
}

export function parseKp(json: unknown): Live['kp'] {
  if (!Array.isArray(json)) return null;
  const out: { t: number; kp: number }[] = [];
  for (const row of json) {
    // The feed has been both a list of objects and a table with a header row.
    const [tag, value] = Array.isArray(row) ? [row[0], row[1]] : [(row as { time_tag?: unknown })?.time_tag, (row as { kp?: unknown })?.kp];
    const t = Date.parse(`${String(tag).replace(' ', 'T')}Z`);
    const kp = Number(value);
    if (!Number.isNaN(t) && Number.isFinite(kp)) out.push({ t, kp });
  }
  return out.length ? out : null;
}

export async function fetchLive(at: LatLng): Promise<Live> {
  const get = async <T>(url: string, parse: (json: unknown) => T | null): Promise<T | null> => {
    try {
      const res = await fetch(url);
      return res.ok ? parse(await res.json()) : null;
    } catch {
      return null;
    }
  };
  const [alerts, air, kp] = await Promise.all([get(alertsUrl(at), parseAlerts), get(airUrl(at), parseAir), get(KP_URL, parseKp)]);
  return { alerts, air, kp };
}

// ---------------------------------------------------------------- reading it

/** Stay where you are. Nothing is worth going out for. */
const SHELTER = /^(Tornado Warning|Blizzard Warning|Ice Storm Warning|Extreme Wind Warning|Snow Squall Warning)$/;
/** Not a time to be outdoors, though a short trip to somewhere with a roof is fine. */
const INDOORS = /^(Severe Thunderstorm Warning|Winter Storm Warning|Flash Flood Warning|Extreme Cold Warning|Wind Chill Warning|High Wind Warning|Excessive Heat Warning|Extreme Heat Warning|Dust Storm Warning)$/;

export type AlertLevel = 'shelter' | 'indoors' | 'notice';
export const alertLevel = (a: Alert): AlertLevel => (SHELTER.test(a.event) ? 'shelter' : INDOORS.test(a.event) ? 'indoors' : 'notice');

const RANK: Record<AlertLevel, number> = { shelter: 2, indoors: 1, notice: 0 };

/** The most serious warning in force at any point in [from, to]. Advisories and watches don't count here. */
export function warningFor(live: Live | null | undefined, from: number, to: number): { alert: Alert; level: 'shelter' | 'indoors' } | null {
  let worst: { alert: Alert; level: 'shelter' | 'indoors' } | null = null;
  for (const alert of live?.alerts ?? []) {
    const level = alertLevel(alert);
    if (level === 'notice' || alert.from >= to || alert.until <= from) continue;
    if (!worst || RANK[level] > RANK[worst.level]) worst = { alert, level };
  }
  return worst;
}

/** The worst air across [from, to], or null if we don't know. */
export function airFor(live: Live | null | undefined, from: number, to: number): number | null {
  const hours = (live?.air ?? []).filter((h) => h.t + HOUR > from && h.t < Math.max(to, from + 1));
  return hours.length ? Math.max(...hours.map((h) => h.aqi)) : null;
}

export const AIR = { poor: 101, bad: 151 }; // "unhealthy for sensitive groups", "unhealthy"

/** The highest K index forecast across [from, to]. At Madison's latitude it takes about 7 to put the aurora in the sky. */
export function kpFor(live: Live | null | undefined, from: number, to: number): number | null {
  const steps = (live?.kp ?? []).filter((k) => k.t + 3 * HOUR > from && k.t < to);
  return steps.length ? Math.max(...steps.map((k) => k.kp)) : null;
}

export const AURORA_KP = 7;

const lower = (event: string) => event.charAt(0) + event.slice(1).toLowerCase();

/** "Winter storm warning until 9 pm." */
export function alertLine(a: Alert, tz: string): string {
  return `${lower(a.event)} until ${fmtTime(a.until, tz)}.`;
}

/**
 * The one thing most worth knowing about right now, for the opening screen,
 * or null on an ordinary day. `tag` is the two or three words on the banner,
 * `line` the detail it opens to. `say` is what its button asks for (canned
 * words that go through the same parser as everything else) and `act` is the
 * button's label. `tone` is 'warn' for anything to be careful of.
 */
export interface Headline {
  tag: string;
  tone: 'good' | 'warn';
  line: string;
  say?: string;
  act?: string;
}

export function headline(now: number, weather: Weather | null, live: Live | null, sun: Sun, tz: string): Headline | null {
  const warn = warningFor(live, now, now + 3 * HOUR);
  if (warn) {
    const line = alertLine(warn.alert, tz);
    const tag = lower(warn.alert.event);
    if (warn.level === 'shelter') return { tag, tone: 'warn', line: `${line} Stay in. This will keep.` };
    return { tag, tone: 'warn', line: `${line} A time for somewhere with a roof.`, say: 'inside cozy', act: 'Somewhere with a roof' };
  }

  const air = airFor(live, now, now + 3 * HOUR);
  if (air !== null && air >= AIR.bad) return { tag: 'Bad air', tone: 'warn', line: `The air is bad today (index ${Math.round(air)}). Indoors is the better idea.`, say: 'inside', act: 'Somewhere indoors' };

  const here = conditionsFor(weather, now, now + HOUR);
  const dark = now > sun.sunset + 45 * MIN || now < sun.sunrise - 45 * MIN;
  const tonight = dark ? now : sun.sunset + HOUR;
  const nightLook = skyLook(weather, tonight);
  const kp = kpFor(live, tonight, tonight + 6 * HOUR);
  if (kp !== null && kp >= AURORA_KP && now > sun.sunset - 6 * HOUR && (nightLook === 'clear' || nightLook === 'colour' || nightLook === 'plain')) {
    return { tag: 'Northern lights', tone: 'good', line: 'The northern lights may reach this far south tonight. Get away from the streetlights and look north.', say: 'outside tonight', act: 'Somewhere dark' };
  }

  // Weather about to turn: say when, while there's still time to go first.
  if (weather && here.known && here.sky === 'dry') {
    for (let t = now + HOUR; t <= now + 4 * HOUR; t += HOUR) {
      const then = conditionsFor(weather, t, t + 1);
      if (!then.known || then.sky === 'dry' || then.sky === 'damp') continue;
      const h = hourAt(weather, t)!;
      const what = then.sky === 'storm' ? 'Storms' : /snow/.test(then.summary) ? 'Snow' : 'Rain';
      return { tag: `${what} by ${fmtTime(h.t, tz)}`, tone: 'warn', line: `${what} ${what === 'Storms' ? 'are' : 'is'} due around ${fmtTime(h.t, tz)}. Go now, or plan for indoors.` };
    }
  }

  const toSunset = (sun.sunset - now) / MIN;
  if (here.known && here.sky === 'dry' && toSunset > 15 && toSunset < 150) {
    const look = skyLook(weather, sun.sunset);
    if (look === 'colour') return { tag: 'Good sunset', tone: 'good', line: `Sunset is at ${fmtTime(sun.sunset, tz)}, and the forecast leaves high cloud for it to light up. Find a view west.`, say: 'sunset outside', act: 'Find me a view west' };
    if (look === 'clear') return { tag: 'Clear sunset', tone: 'good', line: `Sunset is at ${fmtTime(sun.sunset, tz)} under a clear sky. Find a view west.`, say: 'sunset outside', act: 'Find me a view west' };
  }
  if (here.known && /snowing|flurries/.test(here.summary)) return { tag: 'Snowing', tone: 'good', line: "It's snowing. Go and look at it, or watch from somewhere warm.", say: 'cozy', act: 'Somewhere warm' };

  const daylight = now > sun.sunrise && now < sun.sunset - 30 * MIN;
  if (here.known && here.sky === 'dry' && daylight && here.feelsF >= 62 && here.feelsF <= 82 && (here.windMph ?? 0) < 18) {
    if (here.windMph !== null && here.windMph <= 5) return { tag: 'Flat lakes', tone: 'good', line: `${Math.round(here.tempF)}° and hardly a breath of wind. The lakes will be flat.`, say: 'outside water', act: 'Get me on the water' };
    return { tag: 'A fine day', tone: 'good', line: `${Math.round(here.tempF)}° and dry. Days like this are for being outside.`, say: 'outside', act: 'Get me outside' };
  }
  if (here.known && here.sky === 'dry' && dark && moonNearFull(now) && nightLook === 'clear') {
    return { tag: 'Moonlit night', tone: 'good', line: 'Clear, and the moon is close to full. The lakes will be lit.', say: 'outside tonight', act: 'Take me out under it' };
  }
  return null;
}
