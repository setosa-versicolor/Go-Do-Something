import { describe, expect, it } from 'vitest';
import { parseIntent, resolveStart } from '../src/core/intent';
import { at, TZ } from './helpers';

describe('intent', () => {
  it('hears moods in plain language', () => {
    expect(parseIntent('need to think').moods).toEqual({ think: 1 });
    expect(parseIntent('Date night').moods.date).toBe(1);
    expect(parseIntent('a friend is visiting').moods.showoff).toBe(1);
    expect(parseIntent('rainy afternoon')).toMatchObject({ moods: { cozy: 1 }, inside: true });
  });

  it('turns "kids need to burn energy" into a constraint and two moods', () => {
    const i = parseIntent('kids need to burn energy');
    expect(i.withKids).toBe(true);
    expect(i.moods).toMatchObject({ kids: 1, move: 1 });
  });

  it('knows a free evening is not about money', () => {
    expect(parseIntent('I have a free evening').cheap).toBe(false);
    expect(parseIntent('something free').cheap).toBe(true);
    expect(parseIntent('cheap date').cheap).toBe(true);
  });

  it('lets "surprise me" override stray mood words', () => {
    const i = parseIntent('surprise me with something fun');
    expect(i.surprise).toBe(true);
    expect(i.moods).toEqual({});
  });

  it('reads durations', () => {
    expect(parseIntent('I have two hours').durationMin).toBe(120);
    expect(parseIntent('90 minutes').durationMin).toBe(90);
    expect(parseIntent('1.5 hours').durationMin).toBe(90);
    expect(parseIntent('half an hour').durationMin).toBe(30);
    expect(parseIntent('a couple of hours').durationMin).toBe(120);
    expect(parseIntent('all afternoon').durationMin).toBe(240);
    expect(parseIntent('coffee').durationMin).toBeUndefined();
  });

  it('hears kinds of place without narrowing the taste', () => {
    expect(parseIntent('drinks')).toMatchObject({ moods: { drink: 1 }, kinds: ['bar'] });
    expect(parseIntent('coffee').kinds).toEqual(['cafe']);
    expect(parseIntent('music show').kinds).toEqual(['music', 'show']);
    expect(parseIntent('art museum books').kinds).toContain('bookstore');
    expect(parseIntent('surprise me with a bar').kinds).toEqual([]);
  });

  it('is empty, not lost, when nothing is said', () => {
    expect(parseIntent('')).toMatchObject({ moods: {}, lost: false, heard: [] });
  });

  it('admits when it understood nothing, rather than failing silently', () => {
    const i = parseIntent('xyzzy plugh');
    expect(i.lost).toBe(true);
    expect(i.moods).toEqual({});
  });

  it('resolves start times in the city zone and never in the past', () => {
    const wed3pm = at(2026, 11, 11, 15);
    expect(resolveStart(parseIntent('tonight').start, wed3pm, TZ)).toBe(at(2026, 11, 11, 18));
    expect(resolveStart(parseIntent('tomorrow morning').start, wed3pm, TZ)).toBe(at(2026, 11, 12, 9));
    expect(resolveStart(parseIntent('saturday morning').start, wed3pm, TZ)).toBe(at(2026, 11, 14, 9));
    expect(resolveStart(parseIntent('tomorrow').start, wed3pm, TZ)).toBe(at(2026, 11, 12, 10));
    // "tonight" at 9 pm means now.
    const wed9pm = at(2026, 11, 11, 21);
    expect(resolveStart(parseIntent('tonight').start, wed9pm, TZ)).toBe(wed9pm);
    // "this morning" in the afternoon means now, not eight hours ago.
    expect(resolveStart(parseIntent('morning coffee').start, wed3pm, TZ)).toBe(wed3pm);
    // "wednesday evening" asked on Wednesday at 9 pm means next week.
    expect(resolveStart(parseIntent('wednesday evening').start, wed9pm, TZ)).toBe(at(2026, 11, 18, 18));
    expect(resolveStart(undefined, wed3pm, TZ)).toBe(wed3pm);
  });

  it('uses the city date even when UTC has already rolled over', () => {
    // 11 pm Wednesday in Madison is Thursday in UTC. "Tomorrow" is still Thursday.
    const late = at(2026, 11, 11, 23);
    expect(resolveStart(parseIntent('tomorrow morning').start, late, TZ)).toBe(at(2026, 11, 12, 9));
  });
});
