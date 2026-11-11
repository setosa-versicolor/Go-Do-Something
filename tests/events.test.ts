import { describe, expect, it } from 'vitest';
import { clean, loadEvents, parseIsthmusTitle, STALE_AFTER, toOption, type RawEvent } from '../src/core/events';
import { fmtTime, HOUR } from '../src/core/time';
import { venues } from '../src/cities/madison';
import { at, TZ } from './helpers';

const raw = (over: Partial<RawEvent>): RawEvent => ({
  source: 'test', title: 'Doug White Quartet', description: 'Jazz. Free.', start: at(2026, 11, 12, 19), venue: 'Cafe Coda', url: 'https://example.org/e', ...over,
});

describe('event listings', () => {
  it('parses Isthmus titles as Madison wall time', () => {
    const e = parseIsthmusTitle('Salsa Dance - Nov 10, 2026 7:30 PM - 10:30 PM @ Cafe Coda', TZ)!;
    expect(e).toMatchObject({ title: 'Salsa Dance', venue: 'Cafe Coda', start: at(2026, 11, 10, 19, 30), end: at(2026, 11, 10, 22, 30) });
    // Summer listings land in daylight time, not a fixed offset.
    expect(parseIsthmusTitle('X - Jul 4, 2026 12:00 PM @ Y', TZ)!.start).toBe(Date.UTC(2026, 6, 4, 17));
    // No end time given, a title containing dashes, an end past midnight.
    expect(parseIsthmusTitle('A - B - Nov 11, 2026 5:45 PM @ Movin&apos; Shoes', TZ)).toMatchObject({ title: 'A - B', end: undefined, venue: "Movin' Shoes" });
    const late = parseIsthmusTitle('DJ Night - Nov 13, 2026 10:00 PM - 1:00 AM @ Mickey\'s Tavern', TZ)!;
    expect(fmtTime(late.end!, TZ)).toBe('1 am');
    expect(late.end! - late.start).toBe(3 * HOUR);
    expect(parseIsthmusTitle('Not an event title', TZ)).toBeNull();
  });

  it('keeps a real show at a venue we know', () => {
    const o = toOption(raw({}), venues)!;
    expect(o).toMatchObject({ kind: 'event', category: 'music', what: 'Live music at Cafe Coda', price: 0, dropIn: false, hood: 'Willy Street' });
    expect(o.when!.end - o.when!.start).toBe(2 * HOUR); // assumed length when none is given
  });

  it('drops filler, unknown venues, sold-out shows, and things it cannot classify', () => {
    expect(toOption(raw({ title: 'Intro to Pottery Workshop' }), venues)).toBeNull();
    expect(toOption(raw({ title: 'Trivia Night', venue: "Mickey's Tavern" }), venues)).toBeNull();
    expect(toOption(raw({ venue: 'Somebody\'s Basement' }), venues)).toBeNull();
    expect(toOption(raw({ title: 'SOLD OUT: Big Band' }), venues)).toBeNull();
    expect(toOption(raw({ title: 'Quarterly Gathering', description: '', venue: 'Madison Public Market' }), venues)).toBeNull();
    expect(toOption(raw({ title: 'Art Exhibition', description: 'paintings', end: at(2026, 11, 13, 19) }), venues)).toBeNull();
  });

  it('labels by what the listing says, else by what the venue does', () => {
    expect(toOption(raw({ title: 'The Mic on State', description: '$5.', venue: 'Comedy on State' }), venues)).toMatchObject({ what: 'Show at Comedy on State', kids: 0, price: 1 });
    expect(toOption(raw({ title: 'Our Land', description: 'MMoCA Cinema screening.', venue: 'Madison Museum of Contemporary Art' }), venues)).toMatchObject({ category: 'show', what: 'Film at Madison Museum of Contemporary Art', placeId: 'mmoca' });
    expect(toOption(raw({ title: 'A Poet', description: 'Poetry reading. $45', venue: "A Room of One's Own" }), venues)).toMatchObject({ category: 'talk', price: 3 });
  });

  it('cleans markup and double-encoded entities', () => {
    expect(clean('7 &amp;amp; 9 pm. <b>$20</b>&nbsp;adv.')).toBe('7 & 9 pm. $20 adv.');
  });

  it('refuses a stale or malformed events file instead of showing it', () => {
    const now = at(2026, 11, 11, 12);
    const good = toOption(raw({}), venues)!;
    const over = toOption(raw({ start: at(2026, 11, 10, 19) }), venues)!;
    expect(loadEvents({ generatedAt: now - HOUR, events: [good, over, { id: 'broken' }, null] }, now)).toEqual([good]);
    expect(loadEvents({ generatedAt: now - STALE_AFTER - 1, events: [good] }, now)).toEqual([]);
    expect(loadEvents(null, now)).toEqual([]);
    expect(loadEvents({ events: 'nope' }, now)).toEqual([]);
  });
});
