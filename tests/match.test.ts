import { describe, expect, it } from 'vitest';
import { summarize, type Entry } from '../src/core/history';
import { openIntervals } from '../src/core/hours';
import { match, statusLine } from '../src/core/match';
import { sunFor } from '../src/core/sun';
import { DAY, HOUR, MIN, toLocal } from '../src/core/time';
import { GROUP } from '../src/core/types';
import { places } from '../src/cities/madison';
import { at, option, request, TZ, weatherOf, world } from './helpers';

const ids = (r: ReturnType<typeof match>) => r.picks.map((p) => p.option.id);
const SAYS = ['', 'need to think', 'date night', 'kids need to burn energy', 'rainy afternoon', 'a friend is visiting', 'cheap', 'surprise me', 'drinks', 'hungry'];

describe('what gets picked is actually doable', () => {
  it('never suggests anything closed, out of season, or unreachable — across a year of moments', () => {
    let checked = 0;
    for (const [mo, d] of [[1, 17], [3, 8], [5, 15], [7, 4], [9, 26], [11, 1], [11, 11], [12, 24]] as const) {
      for (const h of [0, 3, 7, 10, 13, 16, 19, 22]) {
        for (const say of SAYS) {
          for (const mode of ['walk', 'drive'] as const) {
            const start = at(2026, mo, d, h, 20);
            const req = request(start, say, { mode, durationMin: say === 'cheap' ? 60 : 150 });
            const r = match(req, world());
            expect(r.picks.length).toBeLessThanOrEqual(3);
            expect(new Set(ids(r)).size).toBe(r.picks.length);
            if (r.picks.length < 3) expect(r.note).toBeTruthy();
            const end = start + req.durationMin * MIN;
            for (const p of r.picks) {
              checked++;
              const arrive = start + p.travelMin * MIN;
              expect(p.begin).toBeGreaterThanOrEqual(arrive);
              // Open for at least the minimum worthwhile visit, starting when we say.
              const open = openIntervals(p.option, p.begin, p.begin + 1, TZ).some(([s, e]) => s <= p.begin && e >= p.begin + p.option.minutes[0] * MIN);
              expect(open, `${p.option.id} at ${mo}/${d} ${h}:20 (${say})`).toBe(true);
              // And you can get back inside your window, unless the card says outright that it runs later.
              if (!p.caveat) expect(p.begin + p.option.minutes[0] * MIN + p.travelMin * MIN).toBeLessThanOrEqual(end);
              expect(p.stayMin).toBeGreaterThanOrEqual(p.option.minutes[0]);
              expect(p.reason.length).toBeGreaterThan(10);
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(1500);
  }, 60_000);

  it('keeps seasonal places in their season', () => {
    for (let h = 8; h < 22; h += 2) {
      const r = match(request(at(2026, 11, 11, h), 'a friend is visiting'), world());
      expect(ids(r)).not.toContain('union-terrace');
      expect(ids(r)).not.toContain('olbrich-biergarten');
    }
    const july = match(request(at(2026, 7, 8, 19), 'a friend is visiting'), world());
    expect(july.debug.ranked.map((p) => p.option.id)).toContain('union-terrace');
  });

  it("doesn't send anyone down a trail in the dark", () => {
    for (const h of [17, 18, 20, 5]) {
      const r = match(request(at(2026, 11, 11, h)), world());
      for (const p of r.picks) expect(p.option.needs ?? []).not.toContain('daylight');
    }
    // Nor to one where the light runs out before the minimum visit.
    const start = at(2026, 11, 11, 16, 15);
    const sun = sunFor(start, 43.07, -89.38, TZ);
    const r = match(request(start, 'nature'), world());
    for (const p of r.picks.filter((x) => x.option.needs?.includes('daylight'))) {
      expect(p.begin + p.stayMin * MIN).toBeLessThanOrEqual(sun.sunset + 21 * MIN);
    }
  });

  it('respects travel time for the way you are getting around', () => {
    const r = match(request(at(2026, 7, 11, 10), '', { mode: 'walk', durationMin: 60 }), world());
    expect(r.picks.length).toBeGreaterThan(0);
    for (const p of r.picks) expect(p.travelMin).toBeLessThanOrEqual(18);
  });

  it('says so, with reasons, when nothing fits', () => {
    const r = match(request(at(2026, 11, 12, 3)), world());
    expect(r.picks).toEqual([]);
    expect(r.note).toMatch(/Nothing honest/);
    expect(r.note).toMatch(/closed then/);
    expect(r.debug.rejected.length).toBe(places.length);
  });

  it('admits when only one or two things fit instead of padding', () => {
    const opts = [option({ id: 'a' }), option({ id: 'b', rules: [{ hours: 'mo 09:00-10:00' }] })];
    const r = match(request(at(2026, 11, 11, 12)), world({ options: opts }));
    expect(ids(r)).toEqual(['a']);
    expect(r.note).toMatch(/Only one thing really fits/);
  });

  it('still answers when it did not understand, and says that too', () => {
    const r = match(request(at(2026, 11, 11, 12), 'xyzzy plugh'), world());
    expect(r.picks).toHaveLength(3);
    expect(r.note).toMatch(/didn't follow/);
  });
});

describe('weather', () => {
  const noon = at(2026, 7, 8, 12);

  it('keeps people indoors-or-covered when it is pouring', () => {
    const r = match(request(noon), world({ weather: weatherOf(noon, { tempF: 68, code: 65, precipProb: 95, precipMm: 4 }) }));
    expect(r.picks).toHaveLength(3);
    for (const p of r.picks) expect(p.option.setting).not.toBe('out');
    expect(r.conditions.summary).toBe('68° and raining');
  });

  it('calls fog fog, without letting it rule anything out', () => {
    const fog = match(request(noon), world({ weather: weatherOf(noon, { tempF: 52, code: 45 }) }));
    expect(fog.conditions.foggy).toBe(true);
    expect(fog.conditions.sky).toBe('dry');
    expect(fog.conditions.summary).toBe('52° and foggy');
    const clear = match(request(noon), world({ weather: weatherOf(noon, { tempF: 52 }) }));
    expect(fog.picks.map((p) => p.option.id)).toEqual(clear.picks.map((p) => p.option.id));
  });

  it('uses the weather as the reason when it is the reason', () => {
    const rain = match(request(noon, 'rainy afternoon', { start: noon }), world({ weather: weatherOf(noon, { tempF: 60, code: 63, precipProb: 90, precipMm: 2 }) }));
    expect(rain.picks.some((p) => /wait it out/.test(p.reason))).toBe(true);
    const fine = match(request(noon, 'outside'), world({ weather: weatherOf(noon, { tempF: 72 }) }));
    expect(fine.picks.some((p) => /72° and dry/.test(p.reason))).toBe(true);
  });

  it('only suggests swimming and paddling when it is warm enough', () => {
    const cold = match(request(noon, 'swim paddle'), world({ weather: weatherOf(noon, { tempF: 58 }) }));
    for (const p of cold.picks) expect(p.option.needs ?? []).not.toContain('warm');
    const hot = match(request(noon, 'swim paddle'), world({ weather: weatherOf(noon, { tempF: 88 }) }));
    expect(hot.picks.some((p) => p.option.needs?.includes('warm'))).toBe(true);
  });

  it('only suggests sledding when it can see snow on the ground', () => {
    const jan = at(2026, 1, 17, 13);
    const has = (w: ReturnType<typeof weatherOf> | null) =>
      match(request(jan, 'kids sledding'), world({ weather: w })).debug.ranked.some((p) => p.option.id === 'elver-sledding');
    expect(has(weatherOf(jan, { tempF: 22, snowIn: 6 }))).toBe(true);
    expect(has(weatherOf(jan, { tempF: 22, snowIn: 0 }))).toBe(false);
    expect(has(null)).toBe(false); // unknown is not the same as yes
  });

  it('works without any weather at all', () => {
    const r = match(request(noon), world({ weather: null }));
    expect(r.conditions.known).toBe(false);
    expect(r.picks).toHaveLength(3);
  });
});

describe('constraints', () => {
  const sat = at(2026, 11, 14, 11);

  it('never suggests a bar when kids are along', () => {
    for (const say of ['kids', 'family dinner', 'my daughter is bored']) {
      const r = match(request(at(2026, 11, 14, 17), say, { durationMin: 180 }), world());
      expect(r.picks.length).toBeGreaterThan(0);
      for (const p of r.picks) expect(p.option.kids).toBeGreaterThan(0);
    }
  });

  it('keeps cheap cheap and indoors indoors', () => {
    for (const p of match(request(sat, 'cheap food'), world()).picks) expect(p.option.price).toBeLessThan(3);
    for (const p of match(request(sat, 'something indoors'), world()).picks) expect(p.option.setting).not.toBe('out');
  });

  it('only offers things that match what was asked for', () => {
    const r = match(request(at(2026, 11, 13, 19), 'date night', { durationMin: 180 }), world());
    expect(r.picks).toHaveLength(3);
    for (const p of r.picks) expect(p.option.moods.date).toBeGreaterThan(0);
  });
});

describe('broad asks stay broad', () => {
  it('offers cocktail bars as well as dives for "drinks"', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) {
      for (const p of match(request(at(2026, 11, 13, 20), 'drinks', { seed, durationMin: 180 }), world()).picks) seen.add(p.option.id);
    }
    const doable = match(request(at(2026, 11, 13, 20), 'drinks', { durationMin: 180 }), world()).debug.ranked.map((p) => p.option.id);
    for (const id of ['gibs', 'robin-room', 'merchant', 'mickeys', 'le-tigre']) expect(doable).toContain(id);
    // Some pick, across a dozen deals, is a bar you'd choose for a date and not only a dive.
    const classy = places.filter((p) => p.category === 'bar' && p.moods.date === 1).map((p) => p.id);
    expect(classy.some((id) => seen.has(id))).toBe(true);
  });

  it('puts the named kind of place first, and still varies the rest', () => {
    const r = match(request(at(2026, 11, 14, 10), 'coffee'), world());
    expect(r.picks[0]!.option.category).toBe('cafe');
    expect(r.picks[0]!.parts.kind).toBeGreaterThan(0);
    const play = match(request(at(2026, 11, 14, 14), 'play games'), world());
    expect(play.picks.some((p) => p.option.category === 'play')).toBe(true);
  });
});

describe('three different things', () => {
  it('does not offer three versions of the same thing', () => {
    for (const [mo, d, h] of [[11, 14, 11], [7, 11, 14], [11, 11, 19], [5, 15, 9]] as const) {
      for (const say of ['', 'surprise me', 'a friend is visiting', 'date night', 'need to think']) {
        const r = match(request(at(2026, mo, d, h), say, { durationMin: 180 }), world());
        const cats = r.picks.map((p) => p.option.category);
        expect(new Set(cats).size, `${say} ${mo}/${d} ${h}h: ${cats}`).toBe(cats.length);
        if (r.picks.length === 3) expect(new Set(r.picks.map((p) => GROUP[p.option.category])).size).toBeGreaterThan(1);
      }
    }
  });

  it('prefers variety but will not invent it', () => {
    const cafes = ['a', 'b', 'c'].map((id) => option({ id }));
    expect(match(request(at(2026, 11, 11, 12)), world({ options: cafes })).picks).toHaveLength(3);
    const mixed = [...cafes.map((c) => ({ ...c, gem: 0.9 })), option({ id: 'park', category: 'park', gem: 0.4 })];
    expect(ids(match(request(at(2026, 11, 11, 12)), world({ options: mixed })))).toContain('park');
  });

  it('is deterministic for a seed, and the left turn can change with it', () => {
    const start = at(2026, 7, 11, 14);
    const a = match(request(start, '', { seed: 7 }), world());
    const b = match(request(start, '', { seed: 7 }), world());
    expect(ids(a)).toEqual(ids(b));
    const thirds = new Set<string>();
    for (let seed = 1; seed <= 25; seed++) thirds.add(match(request(start, '', { seed }), world()).picks[2]!.option.id);
    expect(thirds.size).toBeGreaterThan(1);
  });

  it('never gives two picks the same reason', () => {
    for (const say of ['', 'date night', 'drinks', 'need to think']) {
      const r = match(request(at(2026, 11, 13, 21), say, { durationMin: 180 }), world());
      const reasons = r.picks.map((p) => p.reason.replace('The left turn. ', ''));
      expect(new Set(reasons).size, say).toBe(reasons.length);
    }
  });

  it('labels the left turn, and it still clears the bar', () => {
    const start = at(2026, 7, 11, 14);
    for (let seed = 1; seed <= 25; seed++) {
      const r = match(request(start, '', { seed }), world());
      const turn = r.picks.find((p) => p.wildcard);
      if (!turn) continue;
      expect(turn.reason).toMatch(/^The left turn\./);
      expect(turn.score).toBeGreaterThanOrEqual(r.debug.ranked[0]!.score * 0.55);
    }
  });

  it('replaces one pick and leaves the other two alone', () => {
    const start = at(2026, 11, 14, 11);
    const first = match(request(start), world());
    const [a, b, c] = ids(first) as [string, string, string];
    const second = match(request(start, '', { keep: [a, c], exclude: [b] }), world());
    expect(ids(second)).toContain(a);
    expect(ids(second)).toContain(c);
    expect(ids(second)).not.toContain(b);
    expect(second.picks).toHaveLength(3);
    // And again: the rejected ones stay rejected.
    const fresh = ids(second).find((id) => id !== a && id !== c)!;
    const third = match(request(start, '', { keep: [a, c], exclude: [b, fresh] }), world());
    expect(ids(third)).not.toContain(b);
    expect(ids(third)).not.toContain(fresh);
  });
});

describe('dated events', () => {
  const start = at(2026, 11, 11, 18);
  const show = (h: number, mi = 0, len = 120) =>
    option({ id: 'show', kind: 'event', category: 'music', dropIn: false, rules: undefined, minutes: [60, 120], moods: { lively: 1 }, when: { start: at(2026, 11, 11, h, mi), end: at(2026, 11, 11, h, mi) + len * MIN } });
  const run = (o: ReturnType<typeof show>, over = {}) => match(request(start, '', { durationMin: 240, ...over }), world({ options: [o] }));

  it('offers an event you can make, with its start time', () => {
    const r = run(show(19));
    expect(ids(r)).toEqual(['show']);
    expect(statusLine(r.picks[0]!, start, TZ)).toBe('Starts at 7 pm');
    expect(r.picks[0]!.reason).toMatch(/It's on tonight/);
  });

  it('drops events that already started, start too late, or run too long', () => {
    expect(run(show(17, 30)).debug.rejected[0]).toMatchObject({ gate: 'missed' });
    expect(run(show(21)).debug.rejected[0]).toMatchObject({ gate: 'late' });
    expect(run(show(19, 0, 300)).debug.rejected[0]).toMatchObject({ gate: 'short' });
    expect(run(show(19), { start: start + DAY, now: start + DAY }).picks).toEqual([]);
  });

  it('treats the farmers market as a Saturday-morning-in-season thing', () => {
    const on = (y: number, mo: number, d: number, h: number) =>
      match(request(at(y, mo, d, h), 'a friend is visiting'), world()).debug.ranked.some((p) => p.option.id === 'farmers-market');
    expect(on(2026, 7, 11, 9)).toBe(true); // Saturday
    expect(on(2026, 7, 12, 9)).toBe(false); // Sunday
    expect(on(2026, 7, 11, 14)).toBe(false); // over
    expect(on(2026, 1, 17, 9)).toBe(false); // winter
  });
});

describe('memory', () => {
  const start = at(2026, 11, 14, 11);
  const mem = (log: Entry[]) => world({ memory: summarize(log, places, start) });
  const top = match(request(start), world()).picks[0]!.option.id;

  it("doesn't bring back somewhere you went and didn't like", () => {
    const r = match(request(start), mem([{ id: top, verb: 'meh', t: start - 5 * DAY }]));
    expect(r.debug.rejected.find((x) => x.id === top)?.gate).toBe('disliked');
  });

  it('rests a place you just went to and liked, then welcomes it back', () => {
    const recent = match(request(start), mem([{ id: top, verb: 'liked', t: start - 3 * DAY }]));
    expect(recent.debug.ranked.find((p) => p.option.id === top)!.parts.been).toBeLessThan(0);
    const later = match(request(start), mem([{ id: top, verb: 'liked', t: start - 60 * DAY }]));
    expect(later.debug.ranked.find((p) => p.option.id === top)!.parts.been).toBeGreaterThan(0);
  });

  it('stays put on reload, but rotates what you saw yesterday', () => {
    const justNow = match(request(start), mem([{ id: top, verb: 'shown', t: start - 10 * MIN }]));
    expect(justNow.debug.ranked.find((p) => p.option.id === top)!.parts.seen).toBeUndefined();
    const yesterday = match(request(start), mem([{ id: top, verb: 'shown', t: start - 20 * HOUR }]));
    expect(yesterday.debug.ranked.find((p) => p.option.id === top)!.parts.seen).toBeLessThan(0);
  });

  it('learns more from going than from tapping', () => {
    const cafe = places.find((p) => p.category === 'cafe')!.id;
    const went = summarize([{ id: cafe, verb: 'liked', t: start - DAY }], places, start).affinity.cafe!;
    const tapped = summarize([{ id: cafe, verb: 'go', t: start - DAY }], places, start).affinity.cafe!;
    const skipped = summarize([{ id: cafe, verb: 'skip', t: start - DAY }], places, start).affinity.cafe!;
    expect(went).toBeGreaterThan(tapped * 2);
    expect(skipped).toBeLessThan(0);
  });
});

describe('explainability', () => {
  it('accounts for every option and every point of score', () => {
    const r = match(request(at(2026, 11, 14, 11), 'date'), world());
    expect(r.debug.ranked.length + r.debug.rejected.length).toBe(places.length);
    for (const p of r.debug.ranked) {
      expect(Object.values(p.parts).reduce((s, v) => s + v, 0)).toBeCloseTo(p.score, 10);
    }
    for (const x of r.debug.rejected) expect(x.why.length).toBeGreaterThan(3);
  });

  it('hedges hours it cannot vouch for', () => {
    const start = at(2026, 11, 14, 11);
    const r = match(request(start), world({ options: [option({ id: 'x', hoursTrust: 'unverified', rules: [{ hours: 'daily 09:00-17:00' }] }), option({ id: 'y', rules: [{ hours: 'daily 09:00-17:00' }] })] }));
    const line = (id: string) => statusLine(r.picks.find((p) => p.option.id === id)!, start, TZ);
    expect(line('x')).toBe('Usually open until 5 pm');
    expect(line('y')).toBe('Open until 5 pm');
  });

  it('says when it opens if you would get there first', () => {
    const start = at(2026, 11, 14, 8, 50);
    const r = match(request(start), world({ options: [option({ id: 'x', rules: [{ hours: 'daily 09:00-17:00' }] })] }));
    expect(r.picks[0]!.waits).toBe(true);
    expect(statusLine(r.picks[0]!, start, TZ)).toBe('Opens at 9 am, until 5 pm');
    expect(toLocal(r.picks[0]!.begin, TZ).h).toBe(9);
  });
});

describe('vibes', () => {
  const start = at(2026, 7, 11, 18);
  const quiet = option({ id: 'quiet', category: 'food', moods: { eat: 1, cozy: 1 } });
  const loud = option({ id: 'loud', category: 'food', moods: { eat: 1, lively: 1 } });
  const library = option({ id: 'library', category: 'library', moods: { cozy: 1 } });
  const pick = (vibe?: string) => {
    const req = request(start, 'hungry');
    req.intent.vibe = vibe;
    return match(req, world({ options: [quiet, loud, library] }));
  };

  it('lean the order toward the feel that was asked for', () => {
    expect(ids(pick('chill'))[0]).toBe('quiet');
    expect(ids(pick('upbeat'))[0]).toBe('loud');
  });

  it("never let in something that isn't what was asked for, and never shut anything out", () => {
    expect(ids(pick('chill'))).not.toContain('library');
    expect(ids(pick('chill')).sort()).toEqual(ids(pick()).sort());
  });

  it('are named as the reason when they tipped it', () => {
    expect(pick('chill').picks.find((p) => p.option.id === 'quiet')!.reason).toBe('Easygoing, like you asked.');
    expect(pick('upbeat').debug.ranked.find((r) => r.option.id === 'quiet')!.parts.vibe).toBeLessThan(0);
  });
});

describe('when everything that fits is too far', () => {
  it('says how far it looked and names the nearest miss, not the things nobody asked for', () => {
    const farWest = { lat: 43.058, lng: -89.503 };
    const r = match(request(at(2026, 11, 13, 9), 'food', { origin: farWest, mode: 'bike', durationMin: 60 }), world());
    expect(r.picks).toEqual([]);
    expect(r.note).toMatch(/within about 18 minutes by bike/);
    expect(r.note).toMatch(/The nearest is .+, about \d+ minutes away/);
    expect(r.note).not.toMatch(/don't match what you asked for/);
  });
});
