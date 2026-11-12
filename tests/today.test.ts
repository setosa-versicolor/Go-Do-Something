import { describe, expect, it } from 'vitest';
import { parseIntent } from '../src/core/intent';
import { happening, match } from '../src/core/match';
import { loadNearby } from '../src/core/nearby';
import { MIN } from '../src/core/time';
import { places } from '../src/cities/madison';
import { at, option, request, world } from './helpers';

// "Local today": only what is specifically on that day. Dated events, and
// markets while they are open. Everything else on the list is always there.

const ids = (r: ReturnType<typeof match>) => r.picks.map((p) => p.option.id);

describe('hearing "local today"', () => {
  it('sets the flag from the tile and from plain phrases', () => {
    for (const say of ['local today', "what's on", 'whats on tonight', 'happening today', 'anything happening tonight', 'events', 'an event near campus']) {
      expect(parseIntent(say), say).toMatchObject({ today: true, lost: false });
    }
  });

  it('adds no mood of its own, and keeps what else was said', () => {
    expect(parseIntent('local today')).toMatchObject({ moods: {}, kinds: [] });
    expect(parseIntent('happening tonight with kids')).toMatchObject({ today: true, withKids: true, start: { dayOffset: 0 } });
  });

  it('leaves ordinary requests alone', () => {
    for (const say of ['', 'food', 'coffee', 'date night', 'quiet', 'surprise me', 'rainy afternoon, two hours, cheap']) {
      expect(parseIntent(say).today, say).toBe(false);
    }
  });
});

describe('matching "local today"', () => {
  const sat9 = at(2026, 7, 11, 9); // a Saturday morning in market season
  const wed6 = at(2026, 11, 11, 18);
  const show = (id: string, h: number, over = {}) =>
    option({ id, kind: 'event', category: 'music', dropIn: false, rules: undefined, minutes: [60, 120], moods: { lively: 1 }, venue: 'A Room', when: { start: at(2026, 11, 11, h), end: at(2026, 11, 11, h) + 120 * MIN }, ...over });
  const map = loadNearby({ places: ['a', 'b', 'c'].map((x, i) => ({ id: `osm-${x}`, n: x, w: 'Restaurant', c: 'food', lat: 43.0747 + i * 0.002, lng: -89.3841, h: 'daily 00:00-24:00', hood: 'Downtown' })) });

  it('picks only events and markets, from the real list plus events', () => {
    const options = [...places, show('early', 19), show('talk', 19, { category: 'talk', moods: { learn: 1 }, lat: 43.08 })];
    for (const [start, expectSome] of [[wed6, ['early', 'talk']], [sat9, ['farmers-market']]] as const) {
      const r = match(request(start, 'local today', { durationMin: 240 }), world({ options }));
      expect(r.picks.length).toBeGreaterThan(0);
      for (const p of r.picks) expect(happening(p.option), p.option.id).toBe(true);
      for (const id of expectSome) expect(ids(r)).toContain(id);
      for (const x of r.debug.rejected.filter((x) => x.gate === 'today')) expect(happening(options.find((o) => o.id === x.id)!)).toBe(false);
    }
  });

  it('offers a market only while it is open', () => {
    const on = (start: number) => ids(match(request(start, 'local today'), world())).includes('farmers-market');
    expect(on(sat9)).toBe(true);
    expect(on(at(2026, 7, 12, 9))).toBe(false); // Sunday
    expect(on(at(2026, 7, 11, 15))).toBe(false); // packed up
  });

  it('does not let other words rule out what is on', () => {
    // A concert has nothing to do with "outside", but it is on, and that was the question.
    const r = match(request(wed6, "what's on outside", { durationMin: 240 }), world({ options: [show('gig', 19)] }));
    expect(ids(r)).toEqual(['gig']);
    // Hard limits still hold.
    const kids = match(request(wed6, "what's on for kids", { durationMin: 240 }), world({ options: [show('gig', 19, { kids: 0 })] }));
    expect(kids.debug.rejected[0]).toMatchObject({ gate: 'kids' });
  });

  it('reads naturally on the card, and never repeats a reason', () => {
    const r = match(request(wed6, 'local today', { durationMin: 240 }), world({ options: [show('one', 19), show('two', 19, { lat: 43.09 }), option({ id: 'stalls', category: 'market', moods: { eat: 1 }, rules: [{ hours: 'we 15:00-21:00' }] })] }));
    const reasons = r.picks.map((p) => p.reason.replace('The left turn. ', ''));
    expect(r.picks).toHaveLength(3);
    expect(new Set(reasons).size).toBe(3);
    expect(reasons).toContain("It's on tonight, and you'd make the start.");
    expect(reasons).toContain("It's open tonight, and you can turn up any time.");
    expect(reasons.some((l) => /^It starts at 7 pm|^It's at A Room/.test(l))).toBe(true);
  });

  it('never fills seats from the map', () => {
    const r = match(request(wed6, 'local today', { durationMin: 240 }), world({ options: [show('gig', 19)], fallback: map }));
    expect(ids(r)).toEqual(['gig']);
    expect(r.note).toMatch(/^Only one thing really fits right now/);
    expect(r.note).not.toMatch(/map/);
    // The same world, asked an ordinary question, does borrow from the map.
    const plain = match(request(wed6, 'hungry', { durationMin: 240 }), world({ options: [], fallback: map }));
    expect(plain.picks.every((p) => p.option.source === 'osm')).toBe(true);
    expect(plain.picks).toHaveLength(3);
  });

  it('says so plainly when nothing is on, and how to fix it', () => {
    const late = match(request(wed6, 'local today', { durationMin: 60 }), world({ options: [...places, show('gig', 21)], fallback: map }));
    expect(late.picks).toEqual([]);
    expect(late.note).toMatch(/^Nothing on in the time you have\./);
    expect(late.note).toMatch(/More time, or a later start/);
    expect(late.note).not.toMatch(/aren't on that day/);
    const none = match(request(wed6, 'local today'), world({ options: [option({ id: 'cafe' })] }));
    expect(none.note).toBe("Nothing on in the time you have. I don't know of an event or a market then. More time, or a later start, would open things up.");
  });

  it('changes nothing for an ordinary request', () => {
    for (const say of ['', 'hungry', 'date night', 'coffee']) {
      const r = match(request(wed6, say), world());
      expect(r.debug.rejected.some((x) => x.gate === 'today'), say).toBe(false);
      expect(r.picks, say).toHaveLength(3);
      expect(r.picks.some((p) => !happening(p.option)), say).toBe(true);
    }
  });
});

describe('what counts as a market for "local today"', () => {
  it('is one that sets up a few days a week, not a food hall or shop open most days', () => {
    expect(happening(option({ id: 'weekly', category: 'market', rules: [{ hours: 'sa 07:00-13:00' }] }))).toBe(true);
    expect(happening(option({ id: 'hall', category: 'market', rules: [{ hours: 'daily 08:00-21:00' }] }))).toBe(false);
    expect(happening(option({ id: 'bar', category: 'bar', rules: [{ hours: 'sa 17:00-23:00' }] }))).toBe(false);
  });
});
