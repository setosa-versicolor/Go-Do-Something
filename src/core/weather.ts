// Weather from Open-Meteo (free, no key, called straight from the browser).

import type { LatLng } from './geo';
import { HOUR } from './time';

export interface WeatherHour {
  t: number;
  tempF: number;
  feelsF: number;
  precipProb: number; // 0-100
  precipMm: number;
  code: number; // WMO weather code
  snowIn: number; // depth on the ground
  /** Cloud by layer, 0-100. Absent when the forecast didn't carry it. */
  cloudLow?: number;
  cloudMid?: number;
  cloudHigh?: number;
  windMph?: number;
  gustMph?: number;
}

export interface Weather {
  fetchedAt: number;
  hours: WeatherHour[];
}

export type Sky = 'dry' | 'damp' | 'wet' | 'storm';

export interface Conditions {
  known: boolean;
  sky: Sky;
  feelsF: number;
  tempF: number;
  snowIn: number;
  /** Fog at the start of the window (WMO 45 or 48). It changes how the sky looks, not what you can do. */
  foggy: boolean;
  /** The strongest steady wind and gust across the window, or null if the forecast didn't say. */
  windMph: number | null;
  gustMph: number | null;
  /** "41° and raining" — only meaningful when known. */
  summary: string;
}

export const UNKNOWN: Conditions = { known: false, sky: 'dry', feelsF: NaN, tempF: NaN, snowIn: 0, foggy: false, windMph: null, gustMph: null, summary: '' };

export function weatherUrl(at: LatLng): string {
  const q = new URLSearchParams({
    latitude: String(at.lat),
    longitude: String(at.lng),
    hourly: 'temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,snow_depth,cloud_cover_low,cloud_cover_mid,cloud_cover_high,wind_speed_10m,wind_gusts_10m',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    timeformat: 'unixtime', // never parse a zoneless local string
    forecast_days: '7',
  });
  return `https://api.open-meteo.com/v1/forecast?${q}`;
}

/** Returns null (not a guess) if the payload isn't what we expect. */
export function parseOpenMeteo(json: unknown, fetchedAt: number): Weather | null {
  const h = (json as { hourly?: Record<string, unknown> } | null)?.hourly;
  const time = h?.time;
  if (!h || !Array.isArray(time) || time.length === 0) return null;
  const col = (k: string): number[] => (Array.isArray(h[k]) ? (h[k] as number[]) : []);
  const temp = col('temperature_2m');
  const feels = col('apparent_temperature');
  const prob = col('precipitation_probability');
  const mm = col('precipitation');
  const code = col('weather_code');
  const snow = col('snow_depth'); // metres
  const num = (k: string, i: number): number | undefined => (typeof col(k)[i] === 'number' ? col(k)[i] : undefined);
  if (temp.length !== time.length) return null;
  const hours: WeatherHour[] = time.map((s: number, i: number) => ({
    t: s * 1000,
    tempF: temp[i] ?? NaN,
    feelsF: feels[i] ?? temp[i] ?? NaN,
    precipProb: prob[i] ?? 0,
    precipMm: mm[i] ?? 0,
    code: code[i] ?? 0,
    snowIn: (snow[i] ?? 0) * 39.37,
    cloudLow: num('cloud_cover_low', i),
    cloudMid: num('cloud_cover_mid', i),
    cloudHigh: num('cloud_cover_high', i),
    windMph: num('wind_speed_10m', i),
    gustMph: num('wind_gusts_10m', i),
  }));
  return { fetchedAt, hours };
}

export async function fetchWeather(at: LatLng, now: number): Promise<Weather | null> {
  try {
    const res = await fetch(weatherUrl(at));
    if (!res.ok) return null;
    return parseOpenMeteo(await res.json(), now);
  } catch {
    return null;
  }
}

function skyOf(h: WeatherHour): Sky {
  if (h.code >= 95) return 'storm';
  const heavy = [63, 65, 66, 67, 73, 75, 81, 82, 86].includes(h.code);
  if (heavy || h.precipMm >= 1 || h.precipProb >= 70) return 'wet';
  const light = (h.code >= 51 && h.code <= 61) || [71, 77, 80, 85].includes(h.code);
  if (light || h.precipMm >= 0.2 || h.precipProb >= 45) return 'damp';
  return 'dry';
}

const RANK: Record<Sky, number> = { dry: 0, damp: 1, wet: 2, storm: 3 };

/** The worst of the weather across [from, to]. Unknown if the forecast doesn't cover it. */
export function conditionsFor(w: Weather | null, from: number, to: number): Conditions {
  if (!w) return UNKNOWN;
  const hours = w.hours.filter((h) => h.t + HOUR > from && h.t < Math.max(to, from + 1));
  if (hours.length === 0 || hours.some((h) => Number.isNaN(h.tempF))) return UNKNOWN;
  let sky: Sky = 'dry';
  let snowy = false;
  for (const h of hours) {
    const s = skyOf(h);
    if (RANK[s] > RANK[sky]) sky = s;
    if ((h.code >= 71 && h.code <= 77) || h.code === 85 || h.code === 86) snowy = true;
  }
  const first = hours[0]!;
  const feelsF = Math.min(...hours.map((h) => h.feelsF));
  const temp = Math.round(first.tempF);
  const foggy = first.code === 45 || first.code === 48;
  const word =
    sky === 'storm' ? 'storming' : sky === 'wet' ? (snowy ? 'snowing' : 'raining') : sky === 'damp' ? (snowy ? 'flurries' : 'drizzly') : foggy ? 'foggy' : 'dry';
  const most = (pick: (h: WeatherHour) => number | undefined): number | null => {
    const all = hours.map(pick).filter((v): v is number => v !== undefined);
    return all.length === hours.length ? Math.max(...all) : null;
  };
  return {
    known: true, sky, feelsF, tempF: first.tempF, snowIn: first.snowIn, foggy,
    windMph: most((h) => h.windMph), gustMph: most((h) => h.gustMph), summary: `${temp}° and ${word}`,
  };
}

/** The forecast hour that contains `t`, if we have it. */
export function hourAt(w: Weather | null, t: number): WeatherHour | null {
  return w?.hours.find((h) => h.t <= t && t < h.t + HOUR) ?? null;
}

/**
 * What the sky is forecast to do with a sunset (or anything else low in the west).
 * 'hidden': low cloud or a solid deck, so there is nothing to see. 'colour': a
 * clear horizon with cloud higher up to catch the light, which is how the good
 * ones start. 'clear': hardly any cloud at all. 'plain': somewhere in between.
 * Null when the forecast doesn't carry cloud layers. A forecast, never a promise.
 */
export type SkyLook = 'hidden' | 'plain' | 'clear' | 'colour';
export function skyLook(w: Weather | null, t: number): SkyLook | null {
  const h = hourAt(w, t);
  if (!h || h.cloudLow === undefined || h.cloudMid === undefined || h.cloudHigh === undefined) return null;
  if (h.cloudLow >= 70 || (h.cloudMid >= 85 && h.cloudLow >= 40)) return 'hidden';
  const above = Math.max(h.cloudMid, h.cloudHigh);
  if (h.cloudLow <= 30 && above >= 30 && h.cloudMid <= 80) return 'colour';
  if (h.cloudLow <= 20 && above < 30) return 'clear';
  return 'plain';
}
