// All wall-clock reasoning happens in the *city's* time zone, never the
// device's or the server's. Instants are epoch milliseconds everywhere.

export interface Local {
  y: number;
  mo: number; // 1-12
  d: number;
  h: number;
  mi: number;
  dow: number; // 0 = Sunday
}

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = formatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      weekday: 'short',
    });
    formatters.set(tz, f);
  }
  return f;
}

/** The wall-clock reading in `tz` at instant `t`. */
export function toLocal(t: number, tz: string): Local {
  const out: Record<string, string> = {};
  for (const p of formatter(tz).formatToParts(new Date(t))) out[p.type] = p.value;
  return {
    y: Number(out.year),
    mo: Number(out.month),
    d: Number(out.day),
    h: Number(out.hour) % 24,
    mi: Number(out.minute),
    dow: DOW.indexOf(out.weekday ?? ''),
  };
}

function offsetAt(t: number, tz: string): number {
  const l = toLocal(t, tz);
  const asUtc = Date.UTC(l.y, l.mo - 1, l.d, l.h, l.mi);
  return asUtc - Math.floor(t / MIN) * MIN;
}

/**
 * The instant at which clocks in `tz` read the given wall time. `minutes` may
 * exceed 1440 (or be negative) and `d` may overflow the month; both roll over
 * correctly. A wall time skipped by spring-forward resolves to the hour after.
 */
export function fromLocal(y: number, mo: number, d: number, minutes: number, tz: string): number {
  const want = Date.UTC(y, mo - 1, d, 0, minutes);
  const first = want - offsetAt(want, tz);
  const second = want - offsetAt(first, tz);
  const reads = (t: number) => t + offsetAt(t, tz) === want;
  if (reads(second)) return second;
  if (reads(first)) return first;
  return Math.max(first, second); // inside the spring-forward gap
}

/** Midnight (start of the local day) containing `t`. */
export function startOfDay(t: number, tz: string): number {
  const l = toLocal(t, tz);
  return fromLocal(l.y, l.mo, l.d, 0, tz);
}

/** Calendar date `n` days after the local date of `t`. */
export function localDatePlus(t: number, n: number, tz: string): { y: number; mo: number; d: number; dow: number } {
  const l = toLocal(t, tz);
  const u = new Date(Date.UTC(l.y, l.mo - 1, l.d + n));
  return { y: u.getUTCFullYear(), mo: u.getUTCMonth() + 1, d: u.getUTCDate(), dow: u.getUTCDay() };
}

/** "9 pm", "9:30 pm", "noon", "midnight" — in the city's zone. */
export function fmtTime(t: number, tz: string): string {
  const { h, mi } = toLocal(t, tz);
  if (mi === 0 && h === 12) return 'noon';
  if (mi === 0 && h === 0) return 'midnight';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${mi ? ':' + String(mi).padStart(2, '0') : ''} ${h < 12 ? 'am' : 'pm'}`;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "today", "tomorrow", or a weekday name, relative to `now`. */
export function fmtDay(t: number, now: number, tz: string): string {
  const days = Math.round((startOfDay(t, tz) - startOfDay(now, tz)) / DAY);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return DAY_NAMES[toLocal(t, tz).dow] ?? '';
}

/** Parse an `<input type="datetime-local">` value as wall time in `tz`. */
export function parseLocalInput(value: string, tz: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  return fromLocal(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]) * 60 + Number(m[5]), tz);
}

/** The inverse of parseLocalInput. */
export function toLocalInput(t: number, tz: string): string {
  const l = toLocal(t, tz);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${l.y}-${p(l.mo)}-${p(l.d)}T${p(l.h)}:${p(l.mi)}`;
}
