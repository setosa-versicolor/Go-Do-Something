// Everything personal stays in this browser's localStorage: what you saved, where you went, what you skipped.
// The one thing that leaves the device is what's typed in the "say it" box, and only when that is switched on (say-log.ts).

import type { Entry } from '../core/history';
import type { Mode } from '../core/geo';
import type { Weather } from '../core/weather';

const LOG = 'gds:log';
const MODE = 'gds:mode';
const START = 'gds:start';
const THEME = 'gds:theme';
const INTRO = 'gds:intro';
const BEAMS = 'gds:beams';
const FORECAST = 'gds:forecast';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or full storage: the app still works, it just forgets.
  }
}

export function loadLog(): Entry[] {
  const log = read<unknown>(LOG, []);
  return Array.isArray(log) ? (log.filter((e) => e && typeof e.id === 'string' && typeof e.verb === 'string' && typeof e.t === 'number') as Entry[]) : [];
}
export const saveLog = (log: Entry[]) => write(LOG, log);

export function loadMode(): Mode {
  const m = read<string>(MODE, 'drive');
  return m === 'bike' || m === 'walk' ? m : 'drive';
}
export const saveMode = (m: Mode) => write(MODE, m);

/** The named area travel is measured from. A device location is never stored. */
export const loadStart = (): string => read<string>(START, '');
export const saveStart = (name: string) => write(START, name);

/** Whether the first-visit introduction has been shown on this device. */
export const seenIntro = (): boolean => read<boolean>(INTRO, false) === true;
export const markIntroSeen = () => write(INTRO, true);

/** Whether to stand a light over tonight's events on the model. Off unless switched on. */
export const loadBeams = (): boolean => read<boolean>(BEAMS, false) === true;
export const saveBeams = (on: boolean) => write(BEAMS, on);

export type Theme = 'auto' | 'light' | 'dark';
export function loadTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME);
    return t === 'light' || t === 'dark' ? t : 'auto';
  } catch {
    return 'auto';
  }
}
export function saveTheme(t: Theme): void {
  try {
    if (t === 'auto') localStorage.removeItem(THEME);
    else localStorage.setItem(THEME, t);
  } catch {
    /* see above */
  }
  if (t === 'auto') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
}

export function forgetEverything(): void {
  try {
    localStorage.removeItem(LOG);
  } catch {
    /* see above */
  }
}

/**
 * The last forecast we got, kept so a reload doesn't ask again and a failed
 * request doesn't leave the page blind. It is the city's weather, not the
 * person's: nothing about them is in it.
 */
export function loadForecast(): Weather | null {
  const w = read<Weather | null>(FORECAST, null);
  const ok = w && typeof w.fetchedAt === 'number' && Array.isArray(w.hours) && w.hours.every((h) => h && typeof h.t === 'number' && typeof h.tempF === 'number');
  return ok ? w : null;
}
export const saveForecast = (w: Weather) => write(FORECAST, w);
