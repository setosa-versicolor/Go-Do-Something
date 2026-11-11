// Sunrise and sunset from the standard sunrise equation. Computed locally so
// daylight reasoning works offline and has exactly one source.

import { toLocal } from './time';

const RAD = Math.PI / 180;

export interface Sun {
  sunrise: number;
  sunset: number;
}

/** Sunrise/sunset instants for the local calendar day (in `tz`) containing `t`. */
export function sunFor(t: number, lat: number, lng: number, tz: string): Sun {
  const l = toLocal(t, tz);
  const n = Math.round(Date.UTC(l.y, l.mo - 1, l.d, 12) / 86_400_000 + 2440587.5 - 2451545.0);
  const jStar = n - lng / 360;
  const M = (357.5291 + 0.98560028 * jStar) % 360;
  const C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const transit = 2451545.0 + jStar + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * lambda * RAD);
  const sinDec = Math.sin(lambda * RAD) * Math.sin(23.4397 * RAD);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * sinDec) / (Math.cos(lat * RAD) * cosDec);
  const H = Math.acos(Math.max(-1, Math.min(1, cosH))) / RAD;
  const toMs = (j: number) => (j - 2440587.5) * 86_400_000;
  return { sunrise: toMs(transit - H / 360), sunset: toMs(transit + H / 360) };
}
