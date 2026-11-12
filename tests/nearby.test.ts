import { describe, expect, it } from 'vitest';
import { match } from '../src/core/match';
import { loadNearby, nearbyRow, osmHours } from '../src/core/nearby';
import { at, option, request, world } from './helpers';

describe('reading OpenStreetMap hours', () => {
  it.each([
    ['24/7', 'daily 00:00-24:00'],
    ['Mo-Su 11:00-21:00', 'daily 11:00-21:00'],
    ['11:00-21:00', 'daily 11:00-21:00'],
    ['Mo-Fr 07:00-18:00; Sa,Su 08:00-14:00', 'mo,tu,we,th,fr 07:00-18:00; sa,su 08:00-14:00'],
    ['Mo-Th 11:00-14:00,17:00-21:00; Fr,Sa 11:00-02:00', 'mo,tu,we,th 11:00-14:00,17:00-21:00; fr,sa 11:00-02:00'],
    ['Mo-Su 11:00-21:00; Tu off', 'mo,we,th,fr,sa,su 11:00-21:00'],
    ['Mo-Sa 10:00-20:00; PH off', 'mo,tu,we,th,fr,sa 10:00-20:00'],
    ['Fr-Mo 17:00-22:00', 'mo,fr,sa,su 17:00-22:00'],
  ])('%s', (osm, ours) => expect(osmHours(osm)).toBe(ours));

  it.each(['', 'sunrise-sunset', 'Apr-Oct: Mo-Su 10:00-18:00', 'Mo-Fr 09:00-17:00; PH 10:00-14:00', 'by appointment', 'Mo-Fr 9am-5pm', 'Mo-Su off', 'week 1-26 Mo 10:00-12:00'])(
    'leaves out what it cannot represent exactly: "%s"', (osm) => expect(osmHours(osm)).toBeNull(),
  );
});

describe('places from the map', () => {
  const el = (tags: Record<string, string>) => ({ type: 'node', id: 7, lat: 43.06, lon: -89.5, tags });

  it('keeps an independent place with a name and hours', () => {
    expect(nearbyRow(el({ amenity: 'restaurant', name: 'Lao Laan-Xang', cuisine: 'lao;thai', opening_hours: 'Tu-Su 11:00-21:00', website: 'https://example.org' }), 'West Side')).toMatchObject({
      id: 'osm-n7', n: 'Lao Laan-Xang', w: 'Lao and Thai restaurant', c: 'food', hood: 'West Side', h: 'tu,we,th,fr,sa,su 11:00-21:00', url: 'https://example.org',
    });
  });

  it('drops chains, the unnamed, and anything without usable hours', () => {
    expect(nearbyRow(el({ amenity: 'cafe', name: 'Chain', brand: 'Chain', opening_hours: '24/7' }), 'x')).toBeNull();
    expect(nearbyRow(el({ amenity: 'cafe', opening_hours: '24/7' }), 'x')).toBeNull();
    expect(nearbyRow(el({ amenity: 'cafe', name: 'No Hours' }), 'x')).toBeNull();
    expect(nearbyRow(el({ amenity: 'fast_food', name: 'Burgers', opening_hours: '24/7' }), 'x')).toBeNull();
  });

  it('survives a bad file', () => {
    expect(loadNearby(null)).toEqual([]);
    expect(loadNearby({ places: [{ id: 'x' }, { id: 'osm-n1', n: 'A', w: 'Café', c: 'cafe', lat: 43, lng: -89, h: 'nonsense', hood: '' }] })).toEqual([]);
    const [ok] = loadNearby({ places: [{ id: 'osm-n1', n: 'A', w: 'Café', c: 'cafe', lat: 43, lng: -89, h: 'daily 07:00-17:00', hood: 'X', url: 'javascript:alert(1)' }] });
    expect(ok).toMatchObject({ source: 'osm', hoursTrust: 'unverified', gem: 0 });
    expect(ok!.url).toBeUndefined();
  });
});

describe('filling seats from the map', () => {
  const start = at(2026, 7, 11, 18);
  const mine = (id: string) => option({ id, category: 'food', moods: { eat: 1 } });
  const [a, b, c] = loadNearby({ places: ['a', 'b', 'c'].map((x, i) => ({ id: `osm-${x}`, n: x, w: 'Restaurant', c: 'food', lat: 43.0747 + i * 0.002, lng: -89.3841, h: 'daily 11:00-22:00', hood: 'Downtown' })) });

  it('never displaces the hand-written list', () => {
    const r = match(request(start, 'hungry'), world({ options: [mine('one'), mine('two'), mine('three')], fallback: [a!, b!, c!] }));
    expect(r.picks.every((p) => p.option.source !== 'osm')).toBe(true);
    expect(r.note).toBeNull();
  });

  it('fills only the empty seats, and says so', () => {
    const r = match(request(start, 'hungry'), world({ options: [mine('one')], fallback: [a!, b!, c!] }));
    expect(r.picks.map((p) => p.option.source ?? 'mine')).toEqual(['mine', 'osm', 'osm']);
    expect(r.note).toMatch(/Only one from my own list fits, so the rest come from the map/);
    expect(r.picks[1]!.reason).toMatch(/finding out for me/);
  });

  it('holds map places to the same gates', () => {
    const r = match(request(at(2026, 7, 11, 3), 'hungry'), world({ options: [], fallback: [a!, b!, c!] }));
    expect(r.picks).toEqual([]);
  });
});
