// Hand (or agent) review of things only a website visit can settle: real
// hours, whether a place still exists. Reviews live in one JSON file per city,
// separate from the writing, so a scheduled reviewer can update facts without
// touching the prose. A review vouches for a place only for a while.

import { inSeason, parseHours } from './hours';
import { DAY } from './time';
import type { Option, Rule } from './types';

export interface Review {
  /** The day the source was read, "YYYY-MM-DD". */
  checked: string;
  /** The page the facts came from. Required: no source, no trust. */
  source: string;
  /** Replacement hours, in the same syntax as places. Omit to confirm the existing ones. */
  hours?: string | Rule[];
  /** Permanently closed: drop it from the list. */
  closed?: boolean;
  note?: string;
}

export type Reviews = Record<string, Review>;

/** After this long a review no longer makes hours 'solid'; the place is due again. */
export const REVIEW_GOOD_FOR = 180 * DAY;

function checkedAt(review: Review, id: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(review.checked ?? '');
  const t = m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN;
  if (Number.isNaN(t)) throw new Error(`Review of "${id}": checked must be YYYY-MM-DD`);
  return t;
}

/** Apply reviews to the curated list. Anything malformed throws: a bad review must fail the build, not ship. */
export function applyReviews(options: Option[], reviews: Reviews, now: number): Option[] {
  const known = new Set(options.map((o) => o.id));
  for (const [id, r] of Object.entries(reviews)) {
    if (!known.has(id)) throw new Error(`Review of unknown place "${id}"`);
    if (!/^https:\/\//.test(r.source ?? '')) throw new Error(`Review of "${id}": source must be an https URL`);
    if (checkedAt(r, id) > now + DAY) throw new Error(`Review of "${id}": checked is in the future`);
    for (const rule of typeof r.hours === 'string' ? [{ hours: r.hours }] : r.hours ?? []) {
      if (parseHours(rule.hours).flat().length === 0) throw new Error(`Review of "${id}": hours are never open`);
      inSeason(rule.season, 1, 1);
    }
  }
  return options.flatMap((o) => {
    const r = reviews[o.id];
    if (!r) return [o];
    if (r.closed) return [];
    const current = now - checkedAt(r, o.id) <= REVIEW_GOOD_FOR;
    return [{
      ...o,
      rules: r.hours === undefined ? o.rules : typeof r.hours === 'string' ? [{ hours: r.hours }] : r.hours,
      // Reviewed hours are kept even once stale (they're still our best guess), but stop being vouched for.
      hoursTrust: current ? 'solid' : o.hoursTrust,
      checked: r.checked,
    }];
  });
}

/** Places whose facts nobody has checked recently, most overdue first. */
export function reviewQueue(options: Option[], reviews: Reviews, now: number): { id: string; name: string; lastChecked: string | null }[] {
  return options
    .filter((o) => o.rules && !(o.hoursTrust === 'solid' && !reviews[o.id])) // rule-based hours (parks) need no review
    .map((o) => ({ id: o.id, name: o.name, lastChecked: reviews[o.id]?.checked ?? null }))
    .filter((q) => !q.lastChecked || now - Date.parse(q.lastChecked) > REVIEW_GOOD_FOR * 0.75)
    .sort((a, b) => (a.lastChecked ?? '').localeCompare(b.lastChecked ?? ''));
}
