import { describe, expect, it } from 'vitest';
import { inSeason, openIntervals, parseHours } from '../src/core/hours';
import { fmtTime, HOUR } from '../src/core/time';
import { at, option, TZ } from './helpers';

describe('hours', () => {
  it('parses days, ranges and split shifts', () => {
    const w = parseHours('mo-fr 07:00-18:00; sa,su 08:00-14:00,17:00-21:00');
    expect(w[1]).toEqual([[420, 1080]]);
    expect(w[6]).toEqual([[480, 840], [1020, 1260]]);
    expect(w[0]).toEqual(w[6]);
  });

  it('treats unlisted days as closed and wraps week ranges', () => {
    expect(parseHours('th-sa 16:00-21:00')[3]).toEqual([]);
    const w = parseHours('fr-mo 10:00-12:00');
    expect([w[5]!.length, w[6]!.length, w[0]!.length, w[1]!.length, w[2]!.length]).toEqual([1, 1, 1, 1, 0]);
  });

  it('rejects malformed hours loudly instead of guessing', () => {
    expect(() => parseHours('weekdays 9-5')).toThrow();
    expect(() => parseHours('mo 25:00-26:00')).toThrow();
  });

  it('carries closing time past midnight', () => {
    const bar = option({ id: 'bar', rules: [{ hours: 'fr 16:00-02:00' }] });
    // Friday Nov 13, 11 pm: open, closes 2 am Saturday.
    const [iv] = openIntervals(bar, at(2026, 11, 13, 23), at(2026, 11, 14, 1), TZ);
    expect(fmtTime(iv![1], TZ)).toBe('2 am');
    // Saturday 1 am is still Friday's shift.
    expect(openIntervals(bar, at(2026, 11, 14, 1), at(2026, 11, 14, 1, 30), TZ)).toHaveLength(1);
    // Saturday 3 am: closed, and not open again within the window.
    expect(openIntervals(bar, at(2026, 11, 14, 3), at(2026, 11, 14, 5), TZ)).toHaveLength(0);
  });

  it('merges round-the-clock days into one interval', () => {
    const park = option({ id: 'p', rules: [{ hours: 'daily 00:00-24:00' }] });
    const ivs = openIntervals(park, at(2026, 11, 11, 22), at(2026, 11, 12, 3), TZ);
    expect(ivs).toHaveLength(1);
    expect(ivs[0]![1] - ivs[0]![0]).toBeGreaterThan(24 * HOUR);
  });

  it('keeps local opening hours right across a DST change', () => {
    const cafe = option({ id: 'c', rules: [{ hours: 'daily 07:00-15:00' }] });
    for (const [mo, d] of [[3, 8], [11, 1]] as const) {
      const [iv] = openIntervals(cafe, at(2026, mo, d, 0, 30), at(2026, mo, d, 23), TZ);
      expect(fmtTime(iv![0], TZ)).toBe('7 am');
      expect(fmtTime(iv![1], TZ)).toBe('3 pm');
    }
  });

  it('knows seasons, including ones that wrap the new year', () => {
    expect(inSeason('04-15..10-20', 4, 15)).toBe(true);
    expect(inSeason('04-15..10-20', 10, 21)).toBe(false);
    expect(inSeason('12-01..03-15', 1, 10)).toBe(true);
    expect(inSeason('12-01..03-15', 11, 30)).toBe(false);
    expect(inSeason(undefined, 2, 29)).toBe(true);
  });

  it('applies the first matching seasonal rule, and none means closed', () => {
    const garden = option({ id: 'g', rules: [{ season: '04-01..09-30', hours: 'daily 09:00-20:00' }, { hours: 'daily 09:00-16:00' }] });
    expect(fmtTime(openIntervals(garden, at(2026, 7, 1, 10), at(2026, 7, 1, 12), TZ)[0]![1], TZ)).toBe('8 pm');
    expect(fmtTime(openIntervals(garden, at(2026, 11, 11, 10), at(2026, 11, 11, 12), TZ)[0]![1], TZ)).toBe('4 pm');
    const terrace = option({ id: 't', rules: [{ season: '04-15..10-20', hours: 'daily 08:00-23:00' }] });
    expect(openIntervals(terrace, at(2026, 11, 11, 10), at(2026, 11, 11, 12), TZ)).toEqual([]);
  });

  it('gives a dated event exactly its own window', () => {
    const show = option({ id: 'e', kind: 'event', rules: undefined, when: { start: at(2026, 11, 11, 19), end: at(2026, 11, 11, 21) } });
    expect(openIntervals(show, at(2026, 11, 11, 18), at(2026, 11, 11, 20), TZ)).toHaveLength(1);
    expect(openIntervals(show, at(2026, 11, 11, 21), at(2026, 11, 11, 23), TZ)).toHaveLength(0);
    expect(openIntervals(show, at(2026, 11, 12, 19), at(2026, 11, 12, 21), TZ)).toHaveLength(0);
  });
});
