// The moon's phase, worked out locally from the length of the lunar month.
// Good to within several hours, which is all "the moon is close to full" needs.

const SYNODIC = 29.530588853; // days from one new moon to the next
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14); // a known new moon

/** 0 = new, 0.5 = full, back to 1 = new. */
export function moonPhase(t: number): number {
  const p = ((t - NEW_MOON) / 86_400_000 / SYNODIC) % 1;
  return p < 0 ? p + 1 : p;
}

/** How much of the disc is lit, 0..1. */
export function moonLit(t: number): number {
  return (1 - Math.cos(2 * Math.PI * moonPhase(t))) / 2;
}

/** Bright and up for most of the night: within about two days of full. */
export function moonNearFull(t: number): boolean {
  return Math.abs(moonPhase(t) - 0.5) < 2 / SYNODIC;
}
