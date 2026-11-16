// How good is the tagging of loaded events? Pure measurement, no opinions of
// its own: an answer key of hand-labelled listings to grade against, and a
// profile of what a week's events look like once tagged. The numbers here are
// what the scheduled tagging review tries to move (see tagging/PLAYBOOK.md).

import { COMPANY, TILES } from './asks';
import type { RawEvent } from './events';
import { parseIntent } from './intent';
import { MOODS, type Category, type Mood, type Option } from './types';
import { VIBES, vibeFit } from './vibes';

/** What a listing should come out as. Fields left out aren't graded: the labeller wasn't sure. */
export interface Expect {
  /** Should it be offered at all? */
  keep: boolean;
  category?: Category;
  setting?: Option['setting'];
  kids?: Option['kids'];
  dropIn?: boolean;
  /** The moods it should carry: all of them, and no others. Strengths aren't graded. */
  moods?: Mood[];
}

export interface GoldenItem {
  id: string;
  /** Rules are tuned against 'dev' and judged on 'holdout', so a rule that only memorises the key shows. */
  split: 'dev' | 'holdout';
  labelled: { by: string; on: string };
  why: string;
  listing: RawEvent;
  expect: Expect;
}

export interface Miss {
  id: string;
  title: string;
  field: string;
  expected: string;
  got: string;
}

export interface Grade {
  items: number;
  /** Share of listings where keep-or-drop was right. */
  keep: number;
  /** Of the listings rightly kept, the share with each field right. */
  category: number;
  setting: number;
  kids: number;
  dropIn: number;
  /** Moods: of those tagged, the share that belong; of those that belong, the share tagged; and their harmonic mean. */
  moodPrecision: number;
  moodRecall: number;
  moodF1: number;
  misses: Miss[];
}

const share = (hits: number, of: number) => (of === 0 ? 1 : hits / of);
const round = (n: number) => Math.round(n * 1000) / 1000;

/** Grade a tagger (a listing in, an option or null out) against the answer key. */
export function grade(items: GoldenItem[], tag: (listing: RawEvent) => Option | null): Grade {
  const misses: Miss[] = [];
  const count = { keep: 0, category: [0, 0], setting: [0, 0], kids: [0, 0], dropIn: [0, 0], tagged: 0, belong: 0, both: 0 };
  for (const item of items) {
    const got = tag(item.listing);
    const miss = (field: string, expected: unknown, was: unknown) => misses.push({ id: item.id, title: item.listing.title.slice(0, 60), field, expected: String(expected), got: String(was) });
    if (Boolean(got) === item.expect.keep) count.keep++;
    else miss('keep', item.expect.keep, Boolean(got));
    if (!got || !item.expect.keep) continue;
    for (const field of ['category', 'setting', 'kids', 'dropIn'] as const) {
      const want = item.expect[field];
      if (want === undefined) continue;
      count[field][1]!++;
      if (got[field] === want) count[field][0]!++;
      else miss(field, want, got[field]);
    }
    if (item.expect.moods) {
      const tagged = Object.keys(got.moods) as Mood[];
      const both = tagged.filter((m) => item.expect.moods!.includes(m));
      count.tagged += tagged.length;
      count.belong += item.expect.moods.length;
      count.both += both.length;
      const extra = tagged.filter((m) => !item.expect.moods!.includes(m));
      const lacking = item.expect.moods.filter((m) => !tagged.includes(m));
      if (extra.length || lacking.length) miss('moods', item.expect.moods.join(' '), `${tagged.join(' ')}${extra.length ? `  (+${extra.join(' +')})` : ''}${lacking.length ? `  (-${lacking.join(' -')})` : ''}`);
    }
  }
  const p = share(count.both, count.tagged);
  const r = share(count.both, count.belong);
  return {
    items: items.length,
    keep: round(share(count.keep, items.length)),
    category: round(share(count.category[0]!, count.category[1]!)),
    setting: round(share(count.setting[0]!, count.setting[1]!)),
    kids: round(share(count.kids[0]!, count.kids[1]!)),
    dropIn: round(share(count.dropIn[0]!, count.dropIn[1]!)),
    moodPrecision: round(p), moodRecall: round(r), moodF1: round(p + r === 0 ? 0 : (2 * p * r) / (p + r)),
    misses,
  };
}

export interface Profile {
  listings: number;
  kept: number;
  /** Share of listings that became events. */
  coverage: number;
  /** Share dropped because nothing said what kind of thing it was: the tagger's own blind spot. */
  unclassified: number;
  dropped: Record<string, number>;
  /** Share of events carrying each mood. */
  moodShare: Record<Mood, number>;
  /** 0 = every event carries the same moods … 1 = the moods are spread evenly. */
  diversity: number;
  /** The most common mood's share. Near 1 means that mood no longer tells events apart. */
  commonest: { mood: Mood; share: number };
  /** Moods no event carries: whole tiles and vibes that can never be answered with an event. */
  silent: Mood[];
  outdoors: number;
  families: number;
  adultsOnly: number;
  oneOffs: number;
  /** For each thing a person can tap: the share of events that would be an answer to it. */
  reach: Record<string, number>;
}

/** Would this event be an answer to those words? The matcher's own test: it carries a mood they asked for, or is the kind of thing they named. */
function answers(o: Option, say: string): boolean {
  const intent = parseIntent(say);
  // With kids along, the answer is what's put on for them.
  if (intent.withKids) return o.kids === 2 || (o.moods.kids ?? 0) > 0;
  if (intent.today) return true;
  const moods = Object.keys(intent.moods) as Mood[];
  if (moods.length === 0) return true;
  return moods.some((m) => (o.moods[m] ?? 0) > 0) || intent.kinds.includes(o.category);
}

/** What a set of tagged events looks like. `dropped` is the count by reason, from the same run. */
export function profile(listings: number, events: Option[], dropped: Record<string, number>): Profile {
  const n = events.length;
  const moodShare = Object.fromEntries(MOODS.map((m) => [m, round(share(events.filter((e) => (e.moods[m] ?? 0) > 0).length, n))])) as Record<Mood, number>;
  // Entropy of how mood tags are spread, against the most it could be.
  const total = MOODS.reduce((s, m) => s + moodShare[m], 0);
  const entropy = total === 0 ? 0 : -MOODS.reduce((s, m) => (moodShare[m] === 0 ? s : s + (moodShare[m] / total) * Math.log(moodShare[m] / total)), 0);
  const commonest = MOODS.map((mood) => ({ mood, share: moodShare[mood] })).sort((a, b) => b.share - a.share)[0]!;
  const reach: Record<string, number> = {};
  for (const [label, , say] of TILES) reach[label] = round(share(events.filter((e) => answers(e, say)).length, n));
  for (const [label, say] of COMPANY) if (say) reach[`with ${label.toLowerCase()}`] = round(share(events.filter((e) => answers(e, say)).length, n));
  for (const v of VIBES) reach[`${v.label} vibe`] = round(share(events.filter((e) => vibeFit(v, e.moods) >= 0.6).length, n));
  return {
    listings, kept: n, coverage: round(share(n, listings)), unclassified: round(share(dropped["can't tell what it is"] ?? 0, listings)), dropped,
    moodShare, diversity: round(entropy / Math.log(MOODS.length)), commonest, silent: MOODS.filter((m) => moodShare[m] === 0),
    outdoors: round(share(events.filter((e) => e.setting === 'out').length, n)),
    families: round(share(events.filter((e) => e.kids === 2).length, n)),
    adultsOnly: round(share(events.filter((e) => e.kids === 0).length, n)),
    oneOffs: round(share(events.filter((e) => e.oneOff).length, n)),
    reach,
  };
}
