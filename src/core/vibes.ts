// Vibes: how the outing should feel, separate from what it is. A vibe never
// rules anything out. It is one more named part of the score, so "food" plus
// "chill" still means food, leaning toward the quiet places.

import type { Mood } from './types';

export interface Vibe {
  id: string;
  label: string;
  blurb: string;
  moods: Partial<Record<Mood, number>>;
  /** Why a pick was chosen, when the vibe is what tipped it. */
  line: string;
}

export const VIBES: Vibe[] = [
  { id: 'chill', label: 'Chill', blurb: 'easy, unhurried', moods: { cozy: 1, think: 0.6, nature: 0.3 }, line: 'Easygoing, like you asked.' },
  { id: 'upbeat', label: 'Upbeat', blurb: 'energy, people, noise', moods: { lively: 1 }, line: 'It has the energy you asked for.' },
  { id: 'romantic', label: 'Romantic', blurb: 'good for two', moods: { date: 1 }, line: 'Made for two, like you asked.' },
  { id: 'curious', label: 'Curious', blurb: 'learn something', moods: { learn: 1, think: 0.4 }, line: "You'll come away knowing something new." },
  { id: 'active', label: 'Active', blurb: 'get moving', moods: { move: 1 }, line: "It'll get you moving, like you asked." },
  { id: 'offbeat', label: 'Offbeat', blurb: 'a little weird', moods: { odd: 1 }, line: 'Offbeat, as requested.' },
];

/** 0 (nothing in common) … 1 (exactly that feel). */
export function vibeFit(vibe: Vibe, moods: Partial<Record<Mood, number>>): number {
  return Math.min(1, (Object.entries(vibe.moods) as [Mood, number][]).reduce((s, [m, w]) => s + w * (moods[m] ?? 0), 0));
}
