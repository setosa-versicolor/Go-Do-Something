import { describe, expect, it } from 'vitest';
import { sunFor } from '../src/core/sun';
import { fmtDay, fmtTime, fromLocal, parseLocalInput, startOfDay, toLocal, toLocalInput, HOUR, MIN } from '../src/core/time';
import { at, TZ } from './helpers';

describe('city time, regardless of where the code runs', () => {
  it('reads the wall clock in the city zone', () => {
    // 03:30 UTC on Nov 12 is still the evening of Nov 11 in Madison (CST, UTC-6).
    const l = toLocal(Date.UTC(2026, 10, 12, 3, 30), TZ);
    expect(l).toMatchObject({ y: 2026, mo: 11, d: 11, h: 21, mi: 30, dow: 3 });
  });

  it('uses daylight time in summer', () => {
    expect(toLocal(Date.UTC(2026, 6, 4, 17, 0), TZ)).toMatchObject({ h: 12, d: 4, dow: 6 });
  });

  it('round-trips wall time → instant → wall time', () => {
    expect(fromLocal(2026, 11, 11, 18 * 60, TZ)).toBe(Date.UTC(2026, 10, 12, 0, 0));
    expect(fromLocal(2026, 7, 4, 18 * 60, TZ)).toBe(Date.UTC(2026, 6, 4, 23, 0));
  });

  it('rolls minutes past midnight into the next day', () => {
    expect(fromLocal(2026, 11, 11, 26 * 60, TZ)).toBe(fromLocal(2026, 11, 12, 2 * 60, TZ));
    expect(fromLocal(2026, 12, 31, 25 * 60, TZ)).toBe(fromLocal(2027, 1, 1, 60, TZ));
  });

  it('handles the short and long DST days', () => {
    // Spring forward: Mar 8 2026 is 23 hours long. Fall back: Nov 1 2026 is 25.
    expect(startOfDay(at(2026, 3, 9, 12), TZ) - startOfDay(at(2026, 3, 8, 12), TZ)).toBe(23 * HOUR);
    expect(startOfDay(at(2026, 11, 2, 12), TZ) - startOfDay(at(2026, 11, 1, 12), TZ)).toBe(25 * HOUR);
    // 2:30 am doesn't exist on Mar 8; it resolves to 3:30 rather than going backwards.
    expect(toLocal(fromLocal(2026, 3, 8, 150, TZ), TZ)).toMatchObject({ h: 3, mi: 30 });
    // Noon is still noon on both days.
    expect(toLocal(at(2026, 3, 8, 12), TZ).h).toBe(12);
    expect(toLocal(at(2026, 11, 1, 12), TZ).h).toBe(12);
  });

  it('gives the same answers whatever the process time zone is', () => {
    const before = process.env.TZ;
    try {
      for (const zone of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles']) {
        process.env.TZ = zone;
        expect(toLocal(Date.UTC(2026, 10, 12, 3, 30), TZ).h).toBe(21);
        expect(fromLocal(2026, 11, 11, 18 * 60, TZ)).toBe(Date.UTC(2026, 10, 12, 0, 0));
      }
    } finally {
      process.env.TZ = before;
    }
  });

  it('formats times and days the way a person would say them', () => {
    expect(fmtTime(at(2026, 11, 11, 21), TZ)).toBe('9 pm');
    expect(fmtTime(at(2026, 11, 11, 9, 30), TZ)).toBe('9:30 am');
    expect(fmtTime(at(2026, 11, 11, 12), TZ)).toBe('noon');
    expect(fmtTime(at(2026, 11, 12, 0), TZ)).toBe('midnight');
    const now = at(2026, 11, 11, 23, 30);
    expect(fmtDay(now + 10 * MIN, now, TZ)).toBe('today');
    expect(fmtDay(now + 40 * MIN, now, TZ)).toBe('tomorrow');
    expect(fmtDay(at(2026, 11, 14, 9), now, TZ)).toBe('Saturday');
  });

  it('treats a picked date-time as city wall time', () => {
    const t = parseLocalInput('2026-11-14T09:00', TZ)!;
    expect(t).toBe(at(2026, 11, 14, 9));
    expect(toLocalInput(t, TZ)).toBe('2026-11-14T09:00');
    expect(parseLocalInput('nonsense', TZ)).toBeNull();
  });
});

describe('sunrise and sunset in Madison', () => {
  const near = (t: number, h: number, mi: number, y: number, mo: number, d: number) =>
    expect(Math.abs(t - at(y, mo, d, h, mi)) / MIN).toBeLessThan(6);

  it('matches published times within a few minutes', () => {
    const nov = sunFor(at(2026, 11, 11, 12), 43.0747, -89.3841, TZ);
    near(nov.sunrise, 6, 44, 2026, 11, 11);
    near(nov.sunset, 16, 38, 2026, 11, 11);
    const jun = sunFor(at(2026, 6, 21, 12), 43.0747, -89.3841, TZ);
    near(jun.sunrise, 5, 18, 2026, 6, 21);
    near(jun.sunset, 20, 41, 2026, 6, 21);
  });

  it('returns the sun for the local day even late in the evening', () => {
    // 11 pm local is already "tomorrow" in UTC; we still want today's sunset.
    const s = sunFor(at(2026, 11, 11, 23), 43.0747, -89.3841, TZ);
    expect(toLocal(s.sunset, TZ).d).toBe(11);
  });
});
