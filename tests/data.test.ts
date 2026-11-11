import { describe, expect, it } from 'vitest';
import { edgeDistance, miles, offsetMiles } from '../src/core/geo';
import { inSeason, parseHours } from '../src/core/hours';
import { CATEGORIES, MOODS } from '../src/core/types';
import { city, places, shape, venues } from '../src/cities/madison';

describe('the Madison list', () => {
  it('has unique ids', () => {
    expect(new Set(places.map((p) => p.id)).size).toBe(places.length);
  });

  it.each(places.map((p) => [p.id, p] as const))('%s is complete and well-formed', (_id, p) => {
    expect(CATEGORIES).toContain(p.category);
    expect(Object.keys(p.moods).length).toBeGreaterThan(0);
    for (const [m, w] of Object.entries(p.moods)) {
      expect(MOODS).toContain(m);
      expect([0.6, 1]).toContain(w);
    }
    expect(miles(city.center, p)).toBeLessThan(12);
    expect(p.minutes[0]).toBeGreaterThanOrEqual(10);
    expect(p.minutes[1]).toBeGreaterThanOrEqual(p.minutes[0]);
    // The writing is the product.
    expect(p.story.length).toBeGreaterThan(80);
    expect(p.nudge!.length).toBeGreaterThan(60);
    expect(p.what.length).toBeLessThanOrEqual(60);
    expect(p.story + p.nudge).not.toMatch(/\b(must-see|hidden gem|iconic|vibrant|nestled|world-class|something for everyone)\b/i);
    // Hours and seasons parse; nothing is "open" for zero minutes a week.
    expect(p.rules!.length).toBeGreaterThan(0);
    for (const r of p.rules!) {
      expect(parseHours(r.hours).flat().length).toBeGreaterThan(0);
      inSeason(r.season, 1, 1);
    }
    for (const m of p.moments ?? []) inSeason(m.season, 1, 1);
    // Anything that only works in daylight or warmth is outdoors.
    if (p.needs?.includes('warm') || p.needs?.includes('snow')) expect(p.setting).toBe('out');
  });

  it('covers every mood with enough choices to pick three', () => {
    for (const m of MOODS) expect(places.filter((p) => p.moods[m]).length, m).toBeGreaterThanOrEqual(6);
  });
});

describe('the shape of the city', () => {
  const water = (east: number, north: number) => Math.min(...shape.lakes.map((l) => edgeDistance(l.outline, east, north)));

  it('has the lakes where the lakes are', () => {
    expect(water(0, 0)).toBeGreaterThan(0.2); // the Capitol is on dry land
    expect(water(-2, 2.5)).toBeLessThan(-0.5); // the middle of Mendota is not
    expect(water(1.2, -0.8)).toBeLessThan(-0.3); // nor the middle of Monona
    expect(shape.lakes.every((l) => l.outline.length >= 12 && l.outline.length % 2 === 0)).toBe(true);
  });

  it('keeps every place and venue out of the water', () => {
    // A pin more than a few hundred feet out into a lake means a bad coordinate.
    const soggy = [...places, ...venues]
      .map((p) => ({ name: 'name' in p ? p.name : p.match, ...offsetMiles(city.center, p) }))
      .filter((p) => water(p.east, p.north) < -0.08)
      .map((p) => p.name);
    expect(soggy).toEqual([]);
  });

  it('puts landmarks on land', () => {
    const soggy = shape.landmarks.filter((m) => m.kind !== 'woods' && water(m.east, m.north) < -0.05).map((m) => m.name);
    expect(soggy).toEqual([]);
  });
});
