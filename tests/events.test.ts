import { describe, expect, it } from 'vitest';
import { clean, dedupe, judge, loadEvents, parseIsthmusTitle, STALE_AFTER, toOption, type RawEvent } from '../src/core/events';
import { parseIsthmus, parseTribe, parseUw } from '../src/core/sources';
import { fmtTime, HOUR } from '../src/core/time';
import { city, venues } from '../src/cities/madison';
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
    const o = toOption(raw({}), venues, city.center)!;
    expect(o).toMatchObject({ kind: 'event', category: 'music', what: 'Live music at Cafe Coda', price: 0, dropIn: false, hood: 'Willy Street' });
    expect(o.when!.end - o.when!.start).toBe(2 * HOUR); // assumed length when none is given
  });

  it('drops filler, unknown venues, sold-out shows, and things it cannot classify', () => {
    expect(toOption(raw({ title: 'Intro to Pottery Workshop' }), venues, city.center)).toBeNull();
    expect(toOption(raw({ title: 'Trivia Night', venue: "Mickey's Tavern" }), venues, city.center)).toBeNull();
    expect(toOption(raw({ venue: 'Somebody\'s Basement' }), venues, city.center)).toBeNull();
    expect(toOption(raw({ title: 'SOLD OUT: Big Band' }), venues, city.center)).toBeNull();
    expect(toOption(raw({ title: 'Quarterly Gathering', description: '', venue: 'Madison Public Market' }), venues, city.center)).toBeNull();
    expect(toOption(raw({ title: 'Art Exhibition', description: 'paintings', end: at(2026, 11, 13, 19) }), venues, city.center)).toBeNull();
  });

  it('labels by what the listing says, else by what the venue does', () => {
    expect(toOption(raw({ title: 'The Mic on State', description: '$5.', venue: 'Comedy on State' }), venues, city.center)).toMatchObject({ what: 'Show at Comedy on State', kids: 0, price: 1 });
    expect(toOption(raw({ title: 'Our Land', description: 'MMoCA Cinema screening.', venue: 'Madison Museum of Contemporary Art' }), venues, city.center)).toMatchObject({ category: 'show', what: 'Film at Madison Museum of Contemporary Art', placeId: 'mmoca' });
    expect(toOption(raw({ title: 'A Poet', description: 'Poetry reading. $45', venue: "A Room of One's Own" }), venues, city.center)).toMatchObject({ category: 'talk', price: 3 });
  });

  it('cleans markup and double-encoded entities', () => {
    expect(clean('7 &amp;amp; 9 pm. <b>$20</b>&nbsp;adv.')).toBe('7 & 9 pm. $20 adv.');
  });

  it('refuses a stale or malformed events file instead of showing it', () => {
    const now = at(2026, 11, 11, 12);
    const good = toOption(raw({}), venues, city.center)!;
    const over = toOption(raw({ start: at(2026, 11, 10, 19) }), venues, city.center)!;
    expect(loadEvents({ generatedAt: now - HOUR, events: [good, over, { id: 'broken' }, null] }, now)).toEqual([good]);
    expect(loadEvents({ generatedAt: now - STALE_AFTER - 1, events: [good] }, now)).toEqual([]);
    expect(loadEvents(null, now)).toEqual([]);
    expect(loadEvents({ events: 'nope' }, now)).toEqual([]);
  });

  it('says why a listing was dropped', () => {
    const why = (over: Partial<RawEvent>) => { const v = judge(raw(over), venues, city.center); return 'dropped' in v ? v.dropped : 'kept'; };
    expect(why({})).toBe('kept');
    expect(why({ venue: 'Nowhere Hall' })).toBe('unknown venue');
    expect(why({ venue: 'Fiserv Forum', lat: 43.045, lng: -87.917 })).toBe('out of town');
    expect(why({ title: 'Budget Workshop' })).toBe('filler');
    expect(why({ title: 'Big Band (cancelled)' })).toBe('sold out or cancelled');
  });

  it('accepts a venue it has no record of when the feed gives coordinates in town', () => {
    const o = toOption(raw({ venue: 'Hamel Something Hall', title: 'Faculty Recital', lat: 43.0735, lng: -89.398 }), venues, city.center)!;
    expect(o).toMatchObject({ category: 'music', hood: 'Campus', lat: 43.0735 });
  });

  it('treats the same show from two calendars as one, keeping the first', () => {
    const a = toOption(raw({ source: 'isthmus', title: 'Everclear', venue: 'The Sylvee' }), venues, city.center)!;
    const b = toOption(raw({ source: 'madtown', title: 'Everclear at The Sylvee', venue: 'The Sylvee', description: 'concert' }), venues, city.center)!;
    const c = toOption(raw({ title: 'Later Show', venue: 'The Sylvee', start: at(2026, 11, 12, 22) }), venues, city.center)!;
    expect(dedupe([a, b, c]).map((o) => o.source + o.name)).toEqual(['isthmusEverclear', 'testLater Show']);
  });
});

describe('calendar parsers', () => {
  it('reads Isthmus RSS items', () => {
    const xml = '<rss><channel><item><title>Salsa Dance - Nov 10, 2026 7:30 PM - 10:30 PM @ Cafe Coda</title><description>Lesson 7:30 pm. $10.</description><link>https://isthmus.com/events/salsa/</link></item><item><title>Not an event</title><link>https://x</link></item></channel></rss>';
    expect(parseIsthmus(xml, TZ)).toEqual([{ source: 'isthmus', title: 'Salsa Dance', venue: 'Cafe Coda', start: at(2026, 11, 10, 19, 30), end: at(2026, 11, 10, 22, 30), description: 'Lesson 7:30 pm. $10.', url: 'https://isthmus.com/events/salsa/' }]);
  });

  it('reads UW events as true instants with building coordinates, skipping all-day and placeless ones', () => {
    const json = [
      { id: 7, title: 'WUD Film Presents: La Haine', description: 'Free.', startDateUnix: 1794616200, endDateUnix: null, allDayEvent: false, tags: ['film'], location: 'The Marquee', building: { name: 'Union South', latlng: [43.0717, -89.4078] } },
      { id: 8, title: 'Exhibition', startDateUnix: 1794376800, allDayEvent: true, building: { name: 'Art Lofts', latlng: [43.07, -89.4] } },
      { id: 9, title: 'Online talk', startDateUnix: 1794616200, allDayEvent: false, building: null },
    ];
    const [e, ...rest] = parseUw(json);
    expect(rest).toEqual([]);
    expect(e).toMatchObject({ source: 'uw', venue: 'Union South', start: 1794616200000, end: undefined, lat: 43.0717, lng: -89.4078, url: 'https://today.wisc.edu/events/view/7' });
    expect(toOption(e!, venues, city.center)).toMatchObject({ category: 'show', what: 'Film at Union South', price: 0 });
    expect(parseUw({ error: true })).toEqual([]);
  });

  it('reads Events Calendar sites from their UTC fields, not the zoneless local ones', () => {
    const json = { events: [
      { title: 'Music Time with Tim', description: '<p>Songs.</p>', url: 'https://m/e', all_day: false, start_date: '2026-11-11 11:00:00', utc_start_date: '2026-11-11 17:00:00', utc_end_date: '2026-11-11 17:30:00', venue: [], categories: [{ name: 'All ages' }] },
      { title: 'Veterans Day', all_day: true, utc_start_date: '2026-11-11 06:00:00', venue: [] },
      { title: 'Everclear at The Sylvee', url: 'https://t/e', all_day: false, utc_start_date: '2026-11-15 01:00:00', utc_end_date: '2026-11-15 01:00:00', venue: { venue: 'The Sylvee', city: 'Madison' }, categories: [{ name: 'Concerts' }] },
    ] };
    const preset = { label: 'Kids’ program', category: 'play' as const, moods: { kids: 1 }, kids: 2 as const, price: 2 as const };
    const mcm = parseTribe(json, 'mcm', { venue: "Madison Children's Museum", preset });
    expect(mcm).toHaveLength(2);
    expect(mcm[0]).toMatchObject({ start: at(2026, 11, 11, 11), end: at(2026, 11, 11, 11, 30), venue: "Madison Children's Museum" });
    expect(toOption(mcm[0]!, venues, city.center)).toMatchObject({ category: 'play', kids: 2, price: 2, placeId: 'childrens-museum', what: 'Kids’ program at Madison Children\'s Museum' });
    // Without a fixed venue, an event with no venue is skipped; an equal end time means "unknown".
    const open = parseTribe(json, 'madtown');
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ venue: 'The Sylvee', start: at(2026, 11, 14, 19), end: undefined });
    expect(parseTribe(null, 'x')).toEqual([]);
    // A museum 'event' that lasts all day is a notice, not a program.
    const notice = { ...mcm[0]!, end: mcm[0]!.start + 7 * HOUR };
    expect(judge(notice, venues, city.center)).toEqual({ dropped: 'all-day listing' });
  });
});
