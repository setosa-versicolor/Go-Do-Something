import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { toOption } from '../src/core/events';
import { floorItems, grade, profile, type Floor, type GoldenItem } from '../src/core/tagging';
import { CATEGORIES, MOODS } from '../src/core/types';
import { city, venues } from '../src/cities/madison';
import { at, option } from './helpers';

// The tagging of loaded events is measured, and the measure may only go up.
// tagging/golden.json is the answer key (real listings, labelled by hand);
// tagging/baseline.json is the floor, graded only on the items it was set on,
// so adding harder listings to the key can't fail it. The process is in tagging/PLAYBOOK.md.

const read = (name: string) => JSON.parse(readFileSync(new URL(`../tagging/${name}`, import.meta.url), 'utf8'));
const golden = (read('golden.json') as { items: GoldenItem[] }).items;
const floor = read('baseline.json') as Floor;
const tag = (listing: GoldenItem['listing']) => toOption(listing, venues, city.center);

describe('the answer key', () => {
  it('is well-formed: unique ids, real categories and moods, a reason for every label', () => {
    expect(new Set(golden.map((g) => g.id)).size).toBe(golden.length);
    for (const g of golden) {
      expect(['dev', 'holdout'], g.id).toContain(g.split);
      expect(g.why.length, g.id).toBeGreaterThan(5);
      expect(g.labelled.by && g.labelled.on, g.id).toBeTruthy();
      expect(typeof g.listing.title === 'string' && Number.isFinite(g.listing.start), g.id).toBe(true);
      if (g.expect.category) expect(CATEGORIES, g.id).toContain(g.expect.category);
      for (const m of g.expect.moods ?? []) expect(MOODS, g.id).toContain(m);
      // A listing that shouldn't be offered has nothing else to say about it.
      if (!g.expect.keep) expect(Object.keys(g.expect), g.id).toEqual(['keep']);
    }
  });

  it('keeps a quarter or so aside for judging', () => {
    const held = golden.filter((g) => g.split === 'holdout').length / golden.length;
    expect(held).toBeGreaterThan(0.15);
    expect(held).toBeLessThan(0.4);
  });
});

describe.each(['dev', 'holdout'] as const)('tagging accuracy on the %s set', (split) => {
  const g = grade(floorItems(golden, floor, split), tag);
  it('the floor names only items in the key, in this split', () => {
    const ids = new Set(golden.filter((x) => x.split === split).map((x) => x.id));
    for (const id of floor.items[split]) expect(ids.has(id), id).toBe(true);
  });
  it.each(Object.entries(floor[split]))('%s is no worse than the floor', (metric, least) => {
    expect(g[metric as keyof typeof g], `${metric} fell below the floor in tagging/baseline.json`).toBeGreaterThanOrEqual(least);
  });
});

describe('the measures themselves', () => {
  const listing = { source: 'test', title: 'Doug White Quartet', description: 'Jazz.', start: at(2026, 11, 12, 19), venue: 'Cafe Coda', url: 'https://example.org' };
  const item = (expect: GoldenItem['expect']): GoldenItem => ({ id: 'x', split: 'dev', labelled: { by: 'test', on: '2026-11-16' }, why: 'a test', listing, expect });

  it('grades keep-or-drop, each field, and moods by precision and recall', () => {
    const right = grade([item({ keep: true, category: 'music', setting: 'in', kids: 1, dropIn: false, moods: ['lively', 'date'] })], tag);
    expect(right).toMatchObject({ keep: 1, category: 1, setting: 1, kids: 1, dropIn: 1, moodPrecision: 1, moodRecall: 1, moodF1: 1, misses: [] });
    // Tagged lively and date; the key says lively and cozy: one of two tagged belongs, one of two that belong is tagged.
    const half = grade([item({ keep: true, category: 'show', moods: ['lively', 'cozy'] })], tag);
    expect(half).toMatchObject({ category: 0, moodPrecision: 0.5, moodRecall: 0.5, moodF1: 0.5 });
    expect(half.misses.map((m) => m.field)).toEqual(['category', 'moods']);
    expect(grade([item({ keep: false })], tag)).toMatchObject({ keep: 0 });
  });

  it('profiles a week: coverage, spread, the moods nobody carries, and what each tap can reach', () => {
    const gig = option({ id: 'gig', kind: 'event', category: 'music', moods: { lively: 1 }, kids: 0 });
    const walk = option({ id: 'walk', kind: 'event', category: 'trail', setting: 'out', moods: { nature: 1 }, kids: 2, oneOff: true });
    const p = profile(10, [gig, walk], { filler: 6, "can't tell what it is": 2 });
    expect(p).toMatchObject({ kept: 2, coverage: 0.2, unclassified: 0.2, outdoors: 0.5, families: 0.5, adultsOnly: 0.5, oneOffs: 0.5 });
    expect(p.moodShare).toMatchObject({ lively: 0.5, nature: 0.5, odd: 0 });
    expect(p.silent).toContain('odd');
    expect(p.reach).toMatchObject({ Outside: 0.5, 'Music & shows': 0.5, 'Something odd': 0, 'with kids': 0.5, 'Local today': 1 });
    // Two moods, evenly used, out of twelve possible.
    expect(p.diversity).toBeCloseTo(Math.log(2) / Math.log(12), 2);
  });
});
