import { describe, expect, it } from 'vitest';
import { sunFor } from '../src/core/sun';
import { partOfDay, skyAt } from '../src/ui/sky';
import { at, TZ } from './helpers';

describe('the sky backdrop', () => {
  const sun = sunFor(at(2026, 11, 11, 12), 43.07, -89.38, TZ); // rises ~6:44, sets ~4:38
  const phase = (h: number, mi = 0) => skyAt(at(2026, 11, 11, h, mi), sun).phase;

  it('follows the real sun in Madison', () => {
    expect(phase(3)).toBe('night');
    expect(phase(6, 50)).toBe('dawn');
    expect(phase(12)).toBe('day');
    expect(phase(16)).toBe('golden');
    expect(phase(16, 55)).toBe('dusk');
    expect(phase(19)).toBe('night');
  });

  it('places the sun along the daylight arc', () => {
    expect(skyAt(at(2026, 11, 11, 3), sun).progress).toBe(0);
    expect(skyAt(at(2026, 11, 11, 11, 41), sun).progress).toBeCloseTo(0.5, 1);
    expect(skyAt(at(2026, 11, 11, 22), sun).progress).toBe(1);
  });

  it('names the part of the day', () => {
    expect([2, 8, 13, 18, 22].map(partOfDay)).toEqual(['night', 'morning', 'afternoon', 'evening', 'night']);
  });
});
