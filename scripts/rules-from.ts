// The tagger as it stood at another git ref (usually main), so a review can be judged against the old rules
// on the same listings: the only fair before-and-after when the answer key grows in the same review.
// Used by `npm run tagging -- --compare <ref>` and by the review guard.

import { execFileSync } from 'node:child_process';
import { unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { city } from '../src/cities/madison';
import type { RawEvent, Venue } from '../src/core/events';
import type { Option } from '../src/core/types';

const root = fileURLToPath(new URL('..', import.meta.url));

/** A tagger built from src/core/events.ts and src/cities/madison/venues.ts as they were at `ref`. */
export async function rulesFrom(ref: string): Promise<(listing: RawEvent) => Option | null> {
  const show = (path: string) => execFileSync('git', ['show', `${ref}:${path}`], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  // Written beside the originals so their relative imports resolve, and removed as soon as they are loaded.
  const events = `${root}src/core/events.rules-from.ts`;
  const venues = `${root}src/cities/madison/venues.rules-from.ts`;
  writeFileSync(events, show('src/core/events.ts'));
  writeFileSync(venues, show('src/cities/madison/venues.ts').replace("'../../core/events'", "'../../core/events.rules-from'"));
  try {
    const e = (await import(pathToFileURL(events).href)) as { toOption: (l: RawEvent, v: Venue[], c: typeof city.center) => Option | null };
    const v = (await import(pathToFileURL(venues).href)) as { VENUES: Venue[] };
    return (listing) => e.toOption(listing, v.VENUES, city.center);
  } finally {
    unlinkSync(events);
    unlinkSync(venues);
  }
}
