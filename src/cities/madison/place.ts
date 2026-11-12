// The shape of a hand-written entry, shared by every file of places.

import type { Mood, Option, Rule } from '../../core/types';

export type Draft = Omit<Option, 'kind' | 'dropIn' | 'hoursTrust' | 'rules' | 'moods' | 'hood'> & {
  hood: string;
  /** "think! nature date" — `!` marks what the place is *for*. */
  moods: string;
  hours: string | Rule[];
  trust?: 'solid';
  kind?: 'event';
};

export const PARK = 'daily 04:00-22:00';
export const ALWAYS = 'daily 00:00-24:00';

export function place(d: Draft): Option {
  const { moods, hours, trust, kind, ...rest } = d;
  const parsed: Partial<Record<Mood, number>> = {};
  for (const word of moods.split(/\s+/)) parsed[word.replace('!', '') as Mood] = word.endsWith('!') ? 1 : 0.6;
  return {
    ...rest,
    kind: kind ?? 'place',
    dropIn: true,
    moods: parsed,
    rules: typeof hours === 'string' ? [{ hours }] : hours,
    hoursTrust: trust ?? 'unverified',
  };
}

