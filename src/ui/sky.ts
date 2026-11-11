// The backdrop is the actual sky over the city right now: phase from the sun,
// greyed when it's wet. Pure, so it can be tested.

import type { Sun } from '../core/sun';
import { MIN } from '../core/time';

export type Phase = 'night' | 'dawn' | 'day' | 'golden' | 'dusk';

export interface Sky {
  phase: Phase;
  /** 0..1 across the daylight arc, for placing the sun. */
  progress: number;
}

export function skyAt(t: number, sun: Sun): Sky {
  const { sunrise, sunset } = sun;
  const progress = Math.min(1, Math.max(0, (t - sunrise) / (sunset - sunrise)));
  let phase: Phase;
  if (t < sunrise - 40 * MIN || t > sunset + 40 * MIN) phase = 'night';
  else if (t < sunrise + 40 * MIN) phase = 'dawn';
  else if (t > sunset) phase = 'dusk';
  else if (t > sunset - 75 * MIN) phase = 'golden';
  else phase = 'day';
  return { phase, progress };
}

export function partOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour < 5) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
}
