// The single answer to "when can you actually do this?" — for places with
// weekly hours, seasonal rules, and one-off events alike.

import type { Option, Rule } from './types';
import { DAY, fromLocal, localDatePlus } from './time';

const DAYS = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'];

/** Minutes-from-midnight ranges per weekday (0 = Sunday). End may exceed 1440. */
export type Week = [number, number][][];

const weekCache = new Map<string, Week>();

function clock(s: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m || Number(m[1]) > 24 || Number(m[2]) > 59) throw new Error(`Bad time "${s}"`);
  return Number(m[1]) * 60 + Number(m[2]);
}

function dayList(spec: string): number[] {
  if (spec === 'daily') return [0, 1, 2, 3, 4, 5, 6];
  const out: number[] = [];
  for (const part of spec.split(',')) {
    const [a, b] = part.split('-');
    const from = DAYS.indexOf(a ?? '');
    const to = b === undefined ? from : DAYS.indexOf(b);
    if (from < 0 || to < 0) throw new Error(`Bad day "${part}"`);
    for (let i = from; ; i = (i + 1) % 7) {
      out.push(i);
      if (i === to) break;
    }
  }
  return out;
}

/** Parse "mo-fr 07:00-18:00; sa,su 08:00-14:00,17:00-02:00". Unlisted days are closed. */
export function parseHours(spec: string): Week {
  const cached = weekCache.get(spec);
  if (cached) return cached;
  const week: Week = [[], [], [], [], [], [], []];
  for (const clause of spec.split(';').map((s) => s.trim()).filter(Boolean)) {
    const [days, ranges, ...rest] = clause.split(/\s+/);
    if (!days || !ranges || rest.length) throw new Error(`Bad hours clause "${clause}"`);
    for (const range of ranges.split(',')) {
      const [a, b] = range.split('-');
      if (!a || !b) throw new Error(`Bad range "${range}"`);
      const start = clock(a);
      let end = clock(b);
      if (end <= start) end += 1440; // closes after midnight
      for (const d of dayList(days)) week[d]!.push([start, end]);
    }
  }
  weekCache.set(spec, week);
  return week;
}

/** Is month/day inside "MM-DD..MM-DD" (inclusive, may wrap the new year)? */
export function inSeason(season: string | undefined, mo: number, d: number): boolean {
  if (!season) return true;
  const m = /^(\d{2})-(\d{2})\.\.(\d{2})-(\d{2})$/.exec(season);
  if (!m) throw new Error(`Bad season "${season}"`);
  const x = mo * 100 + d;
  const from = Number(m[1]) * 100 + Number(m[2]);
  const to = Number(m[3]) * 100 + Number(m[4]);
  return from <= to ? x >= from && x <= to : x >= from || x <= to;
}

export function ruleFor(rules: Rule[], mo: number, d: number): Rule | undefined {
  return rules.find((r) => inSeason(r.season, mo, d));
}

export type Interval = [start: number, end: number];

/**
 * Every stretch during which the option is on, overlapping [from, to].
 * Intervals are NOT clipped: the end is the real closing time.
 */
export function openIntervals(opt: Option, from: number, to: number, tz: string): Interval[] {
  if (opt.when) {
    return opt.when.end > from && opt.when.start < to ? [[opt.when.start, opt.when.end]] : [];
  }
  const out: Interval[] = [];
  const days = Math.ceil((to - from) / DAY) + 1;
  // Start a day early: last night's bar may still be open.
  for (let n = -1; n <= days; n++) {
    const date = localDatePlus(from, n, tz);
    const rule = ruleFor(opt.rules ?? [], date.mo, date.d);
    if (!rule) continue;
    for (const [a, b] of parseHours(rule.hours)[date.dow]!) {
      const start = fromLocal(date.y, date.mo, date.d, a, tz);
      const end = fromLocal(date.y, date.mo, date.d, b, tz);
      if (end > from && start < to) out.push([start, end]);
    }
  }
  out.sort((x, y) => x[0] - y[0]);
  // Merge ranges that touch (e.g. 24-hour days meeting at midnight).
  const merged: Interval[] = [];
  for (const iv of out) {
    const last = merged[merged.length - 1];
    if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
    else merged.push([iv[0], iv[1]]);
  }
  return merged;
}

/** Is the option in season on the local date of `t`? (Dated events are always "in season".) */
export function inSeasonAt(opt: Option, t: number, tz: string): boolean {
  if (opt.when) return true;
  const date = localDatePlus(t, 0, tz);
  return ruleFor(opt.rules ?? [], date.mo, date.d) !== undefined;
}
