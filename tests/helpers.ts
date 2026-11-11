import type { Memory } from '../src/core/history';
import { parseIntent } from '../src/core/intent';
import type { Request, World } from '../src/core/match';
import { fromLocal } from '../src/core/time';
import type { Option } from '../src/core/types';
import type { Weather } from '../src/core/weather';
import { city, places } from '../src/cities/madison';

export const TZ = 'America/Chicago';

/** Wall time in Madison → instant. */
export const at = (y: number, mo: number, d: number, h: number, mi = 0) => fromLocal(y, mo, d, h * 60 + mi, TZ);

export const emptyMemory = (): Memory => ({ lastShown: new Map(), skips: new Map(), went: new Map(), saved: [], affinity: {} });

export function world(over: Partial<World> = {}): World {
  return { city, options: places, weather: null, memory: emptyMemory(), ...over };
}

export function request(start: number, say = '', over: Partial<Request> = {}): Request {
  return { now: start, start, durationMin: 120, origin: city.center, mode: 'drive', intent: parseIntent(say), seed: 1, ...over };
}

/** A flat forecast covering a week around `from`. */
export function weatherOf(from: number, h: { tempF: number; code?: number; precipProb?: number; precipMm?: number; snowIn?: number }): Weather {
  const start = Math.floor(from / 3_600_000) * 3_600_000 - 6 * 3_600_000;
  return {
    fetchedAt: from,
    hours: Array.from({ length: 24 * 7 }, (_, i) => ({
      t: start + i * 3_600_000, tempF: h.tempF, feelsF: h.tempF, precipProb: h.precipProb ?? 0, precipMm: h.precipMm ?? 0, code: h.code ?? 0, snowIn: h.snowIn ?? 0,
    })),
  };
}

export function option(over: Partial<Option> & { id: string }): Option {
  return {
    kind: 'place', name: over.id, what: 'a test place', category: 'cafe', hood: 'Test', lat: city.center.lat, lng: city.center.lng,
    story: 's', nudge: 'n', price: 1, setting: 'in', minutes: [20, 45], kids: 1, moods: { cozy: 1 }, dropIn: true,
    hoursTrust: 'solid', rules: [{ hours: 'daily 00:00-24:00' }], ...over,
  };
}
