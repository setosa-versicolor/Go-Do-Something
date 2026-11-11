// What we remember about a person: a small append-only log, kept on their
// device. Everything the matcher knows about them is derived from this log by
// `summarize`, so there's nothing to migrate and nothing to drift.

import type { Category, Option } from './types';
import { DAY, MIN } from './time';

export type Verb =
  | 'shown' // appeared as a pick
  | 'skip' // "not this one"
  | 'go' // opened directions — intent, not proof
  | 'liked' // check-in: went, and it was good
  | 'meh' // check-in: went, wouldn't again
  | 'nope' // check-in: didn't go
  | 'save'
  | 'unsave';

export interface Entry {
  id: string;
  verb: Verb;
  t: number;
}

export interface Memory {
  lastShown: Map<string, number>;
  skips: Map<string, number[]>;
  went: Map<string, { t: number; liked: boolean }>;
  saved: string[];
  /** -1..1 per category, from what they did far more than what they tapped. */
  affinity: Partial<Record<Category, number>>;
}

export const MAX_LOG = 400;
export const MAX_SAVED = 5;

// How much each action says about taste. Doing outweighs clicking.
const TASTE: Partial<Record<Verb, number>> = { liked: 1, meh: -0.6, go: 0.25, save: 0.3, skip: -0.2 };

export function summarize(log: Entry[], options: Option[], now: number): Memory {
  const byId = new Map(options.map((o) => [o.id, o]));
  const mem: Memory = { lastShown: new Map(), skips: new Map(), went: new Map(), saved: [], affinity: {} };
  const taste: Partial<Record<Category, number>> = {};
  const saved = new Set<string>();
  for (const e of [...log].sort((a, b) => a.t - b.t)) {
    if (e.verb === 'shown') mem.lastShown.set(e.id, e.t);
    if (e.verb === 'skip') mem.skips.set(e.id, [...(mem.skips.get(e.id) ?? []), e.t]);
    if (e.verb === 'liked' || e.verb === 'meh') mem.went.set(e.id, { t: e.t, liked: e.verb === 'liked' });
    if (e.verb === 'save') saved.add(e.id);
    if (e.verb === 'unsave') saved.delete(e.id);
    const cat = byId.get(e.id)?.category;
    const w = TASTE[e.verb];
    if (cat && w) {
      // Taste fades: half as loud every 90 days.
      const fade = 0.5 ** ((now - e.t) / (90 * DAY));
      taste[cat] = (taste[cat] ?? 0) + w * fade;
    }
  }
  for (const [cat, v] of Object.entries(taste) as [Category, number][]) mem.affinity[cat] = Math.tanh(v / 2.5);
  mem.saved = [...saved];
  return mem;
}

/** The outing we should ask about: directions opened a while ago, never answered. */
export function pendingCheckIn(log: Entry[], now: number): string | null {
  const sorted = [...log].sort((a, b) => b.t - a.t);
  for (const e of sorted) {
    if (e.verb !== 'go') continue;
    if (now - e.t < 90 * MIN) continue; // still out, or just looking
    if (now - e.t > 10 * DAY) return null; // too long ago to ask
    const answered = sorted.some((x) => x.id === e.id && x.t >= e.t && (x.verb === 'liked' || x.verb === 'meh' || x.verb === 'nope'));
    return answered ? null : e.id;
  }
  return null;
}

export function append(log: Entry[], id: string, verb: Verb, t: number): Entry[] {
  return [...log, { id, verb, t }].slice(-MAX_LOG);
}
