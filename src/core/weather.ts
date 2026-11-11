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
  /** "41° and raining" — only meaningful when known. */
  summary: string;
}

export const UNKNOWN: Conditions = { known: false, sky: 'dry', feelsF: NaN, tempF: NaN, snowIn: 0, summary: '' };

export function weatherUrl(at: LatLng): string {
  const q = new URLSearchParams({
    latitude: String(at.lat),
    longitude: String(at.lng),
    hourly: 'temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,snow_depth',
    temperature_unit: 'fahrenheit',
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
  if (temp.length !== time.length) return null;
  const hours: WeatherHour[] = time.map((s: number, i: number) => ({
    t: s * 1000,
    tempF: temp[i] ?? NaN,
    feelsF: feels[i] ?? temp[i] ?? NaN,
    precipProb: prob[i] ?? 0,
    precipMm: mm[i] ?? 0,
    code: code[i] ?? 0,
    snowIn: (snow[i] ?? 0) * 39.37,
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
  const word =
    sky === 'storm' ? 'storming' : sky === 'wet' ? (snowy ? 'snowing' : 'raining') : sky === 'damp' ? (snowy ? 'flurries' : 'drizzly') : 'dry';
  return { known: true, sky, feelsF, tempF: first.tempF, snowIn: first.snowIn, summary: `${temp}° and ${word}` };
}
