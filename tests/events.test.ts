import { describe, expect, it } from 'vitest';
import { clean, dedupe, findVenue, judge, loadEvents, markOneOffs, parseIsthmusTitle, STALE_AFTER, toOption, type RawEvent } from '../src/core/events';
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

  it('lets you turn up late to an open mic, a DJ night or a band in a bar, but not a concert', () => {
    const mic = toOption(raw({ title: 'Open Mic', description: '', venue: "Mickey's Tavern", start: at(2026, 11, 15, 22), end: at(2026, 11, 16, 0) }), venues, city.center)!;
    expect(mic).toMatchObject({ what: "Open mic at Mickey's Tavern", dropIn: true });
    expect(toOption(raw({ title: 'DJ Night', description: '', venue: 'Cafe Coda' }), venues, city.center)!.dropIn).toBe(true);
    // Mickey's is a bar: the trio plays to whoever walks in.
    expect(toOption(raw({ venue: "Mickey's Tavern" }), venues, city.center)!.dropIn).toBe(true);
    // Cafe Coda is a listening room; the Sylvee a hall. Be there at the start.
    expect(toOption(raw({}), venues, city.center)!.dropIn).toBe(false);
    expect(toOption(raw({ title: 'Big Touring Band', venue: 'The Sylvee' }), venues, city.center)!.dropIn).toBe(false);
  });

  it('knows an outdoor event from its venue or its own words, and is not fooled by a title', () => {
    const july = at(2026, 7, 8, 19);
    const out = (over: Partial<RawEvent>) => toOption(raw({ start: july, ...over }), venues, city.center)!;
    // A concert on the square: outdoors because of where it is, and an answer to "outside" as well as to music.
    expect(out({ title: 'Wisconsin Chamber Orchestra', description: 'Concerts on the Square.', venue: 'Capitol Square' })).toMatchObject({ setting: 'out', category: 'music', moods: { lively: 1, nature: 0.6 } });
    // Says so itself, at a venue that is otherwise indoors.
    expect(out({ description: 'Jazz on the patio. Outdoor show, weather permitting.' }).setting).toBe('out');
    expect(out({ title: 'Willy Street Fair', description: 'Music, food and a parade.', venue: 'James Madison Park' })).toMatchObject({ setting: 'out', category: 'market', gem: 0.6 });
    // The Terrace is outside in July and inside in November.
    expect(out({ title: 'Open Mic', description: '', venue: 'UW Memorial Union-Terrace' }).setting).toBe('out');
    expect(toOption(raw({ title: 'Open Mic', description: '', venue: 'UW Memorial Union-Terrace' }), venues, city.center)!.setting).toBe('in');
    // In November a park's listing is as likely in the pavilion: it has to say it's outside. The winter farmers' market says the opposite.
    expect(toOption(raw({ title: 'Tenney Winter Art Market', description: '20 artists.', venue: 'Tenney Park' }), venues, city.center)!.setting).toBe('in');
    expect(toOption(raw({ title: 'Candlelight Ski', description: 'Snowshoe or ski the lit trail.', venue: 'Elver Park' }), venues, city.center)!.setting).toBe('out');
    expect(out({ title: "Dane County Farmers' Market", description: 'Indoor market.', venue: 'Capitol Square' }).setting).toBe('in');
    expect(out({ title: 'The Bird and the Worm', description: 'Art reception.', venue: 'Cafe Coda' }).setting).toBe('in');
    // An outing or a parade is a kind of event in its own right, and outdoors by nature.
    expect(out({ title: 'Nature Walk', description: 'Meet at the shelter.', venue: 'Hoyt Park' })).toMatchObject({ what: 'Outing at Hoyt Park', category: 'trail', setting: 'out', moods: { nature: 1 } });
    // As the feed really lists it, with no mention of film: the Cinematheque shows films, so it's a film.
    expect(out({ title: 'Paramount on Parade', description: '1930, 102 min.', venue: 'UW Cinematheque' })).toMatchObject({ setting: 'in', category: 'show' });
    // A film called "Paramount on Parade" is a film, indoors.
    expect(out({ title: 'Paramount on Parade', description: 'A 1930 film revue.', venue: 'UW Cinematheque' })).toMatchObject({ setting: 'in', category: 'show' });
    // Nothing said, an indoor venue: indoors.
    expect(out({})).toMatchObject({ setting: 'in', moods: { lively: 1, date: 0.6 } });
  });

  it('knows a family event when the listing says so, and not when it is only about children', () => {
    const o = (over: Partial<RawEvent>) => toOption(raw(over), venues, city.center)!;
    // A children's musician playing a family show in a bar: for kids, bar or not.
    expect(o({ title: 'David Landau', description: 'Family concert for kids of all ages.', venue: 'Harmony Bar and Grill' })).toMatchObject({ kids: 2, moods: { kids: 1 } });
    expect(o({ description: 'Jazz. All ages welcome.', venue: "Mickey's Tavern" }).kids).toBe(2);
    expect(o({ description: 'Jazz. All ages.', venue: "Mickey's Tavern" }).kids).toBe(1);
    // A bar that says nothing is not for kids; a listening room is fine with them.
    expect(o({ venue: "Mickey's Tavern" }).kids).toBe(0);
    expect(o({}).kids).toBe(1);
    // A film about street kids is not a kids' film. Nor is anything that says 21+.
    expect(o({ title: 'City of God', description: 'Film. Two kids grow up in the favelas of Rio.', venue: 'Union South' })).toMatchObject({ kids: 1 });
    expect(o({ title: 'City of God', description: 'Film. Two kids grow up in the favelas of Rio.', venue: 'Union South' }).moods.kids).toBeUndefined();
    expect(o({ description: 'Jazz and burlesque. 21+.' }).kids).toBe(0);
    expect(o({ description: 'Family show early; 21 and over after 8 pm.' }).kids).toBe(0);
  });

  it('marks what is on once and only once', () => {
    const day = (d: number, title = 'Jake Blount', venue = 'Cafe Coda') => raw({ title, venue, description: 'Folk.', start: at(2026, 11, d, 19) });
    // Published: the 17th. The calendars also show a play running three nights and a jam that comes round again next week.
    const listings = [day(17), day(17, 'Newsies'), day(18, 'Newsies'), day(19, 'Newsies'), day(17, 'Bluegrass Jam'), day(24, 'Bluegrass Jam')];
    const options = [day(17), day(17, 'Newsies'), day(17, 'Bluegrass Jam')].map((r) => toOption(r, venues, city.center)!);
    expect(markOneOffs(options, listings).map((o) => [o.name, Boolean(o.oneOff)])).toEqual([['Jake Blount', true], ['Newsies', false], ['Bluegrass Jam', false]]);
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

  it('calls a social dance something you do, with move, and does not drop it for its "club" or its "practice"', () => {
    const o = (over: Partial<RawEvent>) => toOption(raw(over), venues, city.center);
    // The swing club's weekly night, and the tango lesson/practice before the open dance, are the dance itself.
    expect(o({ title: 'Madison West Coast Swing Club', description: 'Lesson 6:15 pm, open dance, 7-9 pm Tuesdays. $10.', venue: 'Dancesport' })).toMatchObject({ category: 'play', what: 'Social dance at Dancesport', dropIn: true, moods: { move: 1 } });
    expect(o({ title: 'Tango Tuesday', description: 'Lessons/practice 7 pm, open dance 8:30-10:30 pm Tuesdays.' })).toMatchObject({ category: 'play', moods: { move: 1, date: 0.6 } });
    // The old folk forms are odd as well: few would have thought of a contra dance or a polka night.
    expect(o({ title: 'Madison Contra Dance', description: '7:30-9:30 pm Tuesdays. Donations.', venue: 'Wil-Mar Center' })).toMatchObject({ category: 'play', what: 'Folk dance at Wil-Mar Center', moods: { move: 1, odd: 0.6 } });
    expect(o({ title: 'Four Lakes Polka Club', description: 'Dance lesson 6:30 pm, open dance with a live band 7 pm.', venue: 'The Bur Oak' })).toMatchObject({ category: 'play', moods: { move: 1, odd: 0.6 } });
    expect(o({ title: 'Salsa Dance', description: '$10.' })!.moods.odd).toBeUndefined();
    // Near misses: a dance performance is a show to watch; a dance form in a show's name doesn't make it a social dance;
    // a club that isn't a dance is still filler, and so is a dance class.
    expect(o({ title: 'UW Dance Department', description: 'Annual faculty concert.', venue: 'UW Lathrop Hall-H\'Doubler Performance Space' })).toMatchObject({ category: 'show' });
    expect(o({ title: 'Tango Fire', description: 'Argentina\'s touring tango show.', venue: 'Overture Center-Capitol Theater' })).toMatchObject({ category: 'show' });
    expect(o({ title: 'Madison Area Run Club', description: 'Weekly social run.' })).toBeNull();
    expect(o({ title: 'Ballroom Dance Class', description: 'Six-week course, register online.' })).toBeNull();
  });

  it('gives a drink to what you drop in on at a bar, and not to a concert hall or a bar that is only the venue', () => {
    const o = (over: Partial<RawEvent>) => toOption(raw(over), venues, city.center)!;
    // A blues band in a corner bar, an open mic in a tavern: a drink is part of it.
    expect(o({ title: 'Cash Box Kings', description: 'Blues.', venue: 'Crystal Corner Bar', end: at(2026, 11, 12, 22) }).moods.drink).toBe(0.6);
    expect(o({ title: 'Open Mic', description: '', venue: "Mickey's Tavern" }).moods.drink).toBe(0.6);
    // A listening room isn't a bar, and a short set at a bar isn't a night there.
    expect(o({}).moods.drink).toBeUndefined();
    expect(o({ venue: "Mickey's Tavern", end: at(2026, 11, 12, 20) }).moods.drink).toBeUndefined();
  });

  it("reads what a children's program is about instead of calling every one cozy", () => {
    const preset = { label: 'Kids’ program', category: 'play' as const, moods: { kids: 1, cozy: 0.6 }, kids: 2 as const, price: 2 as const };
    const program = (title: string, description: string) => toOption(raw({ source: 'mcm', title, description, venue: "Madison Children's Museum", end: at(2026, 11, 12, 20), preset }), venues, city.center)!.moods;
    expect(program("Let's Move!", 'Movement games, obstacle courses and dances.')).toEqual({ kids: 1, move: 0.6 });
    expect(program('Music Time', 'Tim leads children in singing and other musical activities.')).toEqual({ kids: 1, lively: 0.6 });
    expect(program('Dairy Air', 'Explore the science of breathing.')).toEqual({ kids: 1, learn: 0.6 });
    expect(program('Stories Across Generations', 'A storytime with beloved picture books.')).toEqual({ kids: 1, cozy: 0.6 });
    // Near miss: art that says none of these is for kids, and nothing more.
    expect(program('Messy Art', 'Young children freely explore art materials. Come make a beautiful mess!')).toEqual({ kids: 1 });
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

describe('finding a venue', () => {
  const list = [
    { match: 'communication', exact: true, lat: 1, lng: 1, hood: 'A' },
    { match: 'union south', lat: 2, lng: 2, hood: 'B' },
  ];

  it('matches a fragment anywhere in the name', () => {
    expect(findVenue('UW Union South-The Marquee', list)?.hood).toBe('B');
  });

  it('needs the whole name when the entry says so', () => {
    expect(findVenue('Communication', list)?.hood).toBe('A');
    expect(findVenue('UW Vilas Communication Hall', list)).toBeUndefined();
  });
});
