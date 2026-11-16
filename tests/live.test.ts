import { describe, expect, it } from 'vitest';
import { headline, parseAir, parseAlerts, parseKp, warningFor, type Live } from '../src/core/live';
import { match } from '../src/core/match';
import { moonLit, moonNearFull } from '../src/core/moon';
import { sunFor } from '../src/core/sun';
import { HOUR, MIN } from '../src/core/time';
import { parseOpenMeteo, skyLook, type Weather } from '../src/core/weather';
import { city } from '../src/cities/madison';
import { TZ, at, option, request, weatherOf, world } from './helpers';

const live = (over: Partial<Live> = {}): Live => ({ alerts: [], air: [], kp: [], ...over });
const ids = (r: ReturnType<typeof match>) => r.picks.map((p) => p.option.id);
/** The same flat forecast, with cloud layers and wind on every hour. */
const sky = (from: number, h: Parameters<typeof weatherOf>[1], more: { low?: number; mid?: number; high?: number; wind?: number; gust?: number }): Weather => {
  const w = weatherOf(from, h);
  return { ...w, hours: w.hours.map((x) => ({ ...x, cloudLow: more.low ?? 0, cloudMid: more.mid ?? 0, cloudHigh: more.high ?? 0, windMph: more.wind ?? 8, gustMph: more.gust ?? more.wind ?? 8 })) };
};
const noon = at(2026, 7, 8, 12);
const sunOn = (t: number) => sunFor(t, city.center.lat, city.center.lng, TZ);
const park = option({ id: 'park', category: 'park', setting: 'out', moods: { nature: 1 } });
const cafe = option({ id: 'cafe' });
const patio = option({ id: 'patio', category: 'bar', setting: 'both', moods: { drink: 1 } });

describe('reading the feeds', () => {
  it('reads Weather Service alerts, and ignores tests and cancellations', () => {
    const f = (p: object) => ({ properties: { status: 'Actual', messageType: 'Alert', onset: '2026-07-08T12:00:00-05:00', ends: '2026-07-08T15:00:00-05:00', ...p } });
    const alerts = parseAlerts({ features: [f({ event: 'Tornado Warning' }), f({ event: 'Flood Advisory', status: 'Test' }), f({ event: 'Heat Advisory', messageType: 'Cancel' }), f({ event: 'Wind Advisory', ends: null, expires: '2026-07-08T18:00:00-05:00' })] })!;
    expect(alerts.map((a) => a.event)).toEqual(['Tornado Warning', 'Wind Advisory']);
    expect(alerts[0]).toMatchObject({ from: at(2026, 7, 8, 12), until: at(2026, 7, 8, 15) });
    expect(alerts[1]!.until).toBe(at(2026, 7, 8, 18));
    expect(parseAlerts({ nope: 1 })).toBeNull();
    expect(parseAlerts({ features: [] })).toEqual([]);
  });

  it('reads air quality and the K index, in either shape the feed has had', () => {
    expect(parseAir({ hourly: { time: [1000, 4600], us_aqi: [42, null] } })).toEqual([{ t: 1_000_000, aqi: 42 }]);
    expect(parseAir({ hourly: { time: [1], us_aqi: [] } })).toBeNull();
    expect(parseKp([{ time_tag: '2026-11-09T03:00:00', kp: 3.33 }])).toEqual([{ t: Date.UTC(2026, 10, 9, 3), kp: 3.33 }]);
    expect(parseKp([['time_tag', 'kp'], ['2026-11-09 03:00:00', '7.00']])).toEqual([{ t: Date.UTC(2026, 10, 9, 3), kp: 7 }]);
    expect(parseKp('no')).toBeNull();
  });

  it('reads cloud layers and wind from the forecast, and does without them', () => {
    const base = { time: [1000], temperature_2m: [50], apparent_temperature: [48], precipitation_probability: [0], precipitation: [0], weather_code: [0], snow_depth: [0] };
    expect(parseOpenMeteo({ hourly: base }, 0)!.hours[0]!.windMph).toBeUndefined();
    const full = parseOpenMeteo({ hourly: { ...base, cloud_cover_low: [5], cloud_cover_mid: [20], cloud_cover_high: [60], wind_speed_10m: [7], wind_gusts_10m: [15] } }, 0)!;
    expect(full.hours[0]).toMatchObject({ cloudLow: 5, cloudHigh: 60, windMph: 7, gustMph: 15 });
  });

  it('knows roughly where the moon is', () => {
    // Full moons: 2026-11-24 14:53 UTC and 2026-06-29 23:56 UTC. New moon: 2026-11-09 07:02 UTC.
    expect(moonLit(Date.UTC(2026, 10, 24, 15))).toBeGreaterThan(0.98);
    expect(moonNearFull(Date.UTC(2026, 5, 30))).toBe(true);
    expect(moonLit(Date.UTC(2026, 10, 9, 7))).toBeLessThan(0.02);
    expect(moonNearFull(Date.UTC(2026, 10, 16))).toBe(false);
  });
});

describe('warnings', () => {
  const warning = (event: string, hours = 3): Live => live({ alerts: [{ event, from: noon - HOUR, until: noon + hours * HOUR }] });

  it('offers nothing at all under a tornado warning, and says why', () => {
    const r = match(request(noon), world({ live: warning('Tornado Warning') }));
    expect(r.picks).toEqual([]);
    expect(r.note).toBe("Tornado warning until 3 pm. Stay in. I'll have ideas when it lifts.");
  });

  it('keeps people indoors under a lesser warning, and says so above the picks', () => {
    const r = match(request(noon), world({ options: [park, cafe, patio], live: warning('Severe Thunderstorm Warning') }));
    expect(ids(r).sort()).toEqual(['cafe', 'patio']);
    expect(r.alert).toBe('Severe thunderstorm warning until 3 pm. Nothing here needs you to be outdoors.');
    expect(r.debug.rejected).toEqual([{ id: 'park', gate: 'weather', why: "there's a severe thunderstorm warning out" }]);
  });

  it('does not act on an advisory, a watch, or a warning that is over', () => {
    for (const l of [warning('Wind Advisory'), warning('Tornado Watch'), live({ alerts: [{ event: 'Tornado Warning', from: noon - 3 * HOUR, until: noon - HOUR }] })]) {
      const r = match(request(noon), world({ options: [park, cafe], live: l }));
      expect(ids(r).sort()).toEqual(['cafe', 'park']);
      expect(r.alert).toBeNull();
    }
    expect(warningFor(null, noon, noon + HOUR)).toBeNull();
  });

  it('lets an outing begin once the warning has ended', () => {
    const r = match(request(noon + 4 * HOUR), world({ options: [park], live: warning('Severe Thunderstorm Warning') }));
    expect(ids(r)).toEqual(['park']);
  });
});

describe('the air', () => {
  const air = (aqi: number): Live => live({ air: Array.from({ length: 12 }, (_, i) => ({ t: noon - 2 * HOUR + i * HOUR, aqi })) });

  it('rules out the outdoors when the air is unhealthy', () => {
    const r = match(request(noon), world({ options: [park, cafe], live: air(165) }));
    expect(ids(r)).toEqual(['cafe']);
    expect(r.alert).toMatch(/^The air is bad just now \(index 165\)/);
  });

  it('only leans away when it is merely hazy, and says nothing on a clean day', () => {
    const hazy = match(request(noon), world({ options: [park, cafe], live: air(120) }));
    expect(ids(hazy).sort()).toEqual(['cafe', 'park']);
    expect(hazy.picks.find((p) => p.option.id === 'park')!.parts.air).toBeLessThan(0);
    expect(hazy.alert).toMatch(/hazy/);
    const clean = match(request(noon), world({ options: [park, cafe], live: air(40) }));
    expect(clean.alert).toBeNull();
    expect(clean.picks.every((p) => p.parts.air === undefined)).toBe(true);
  });
});

describe('the sky at sunset', () => {
  const evening = at(2026, 7, 8, 19, 30);
  const view = option({ id: 'view', category: 'view', setting: 'out', moods: { nature: 1 }, best: ['sunset'], minutes: [30, 90] });
  const reason = (w: Weather | null) => match(request(evening), world({ options: [view], weather: w })).picks[0]!.reason;

  it('reads the cloud layers', () => {
    const t = sunOn(evening).sunset;
    expect(skyLook(sky(evening, { tempF: 70 }, { low: 90 }), t)).toBe('hidden');
    expect(skyLook(sky(evening, { tempF: 70 }, { low: 10, high: 60 }), t)).toBe('colour');
    expect(skyLook(sky(evening, { tempF: 70 }, { low: 5, high: 10 }), t)).toBe('clear');
    expect(skyLook(sky(evening, { tempF: 70 }, { low: 50, mid: 40 }), t)).toBe('plain');
    expect(skyLook(weatherOf(evening, { tempF: 70 }), t)).toBeNull();
    expect(skyLook(null, t)).toBeNull();
  });

  it('promises a sunset only when one is on offer', () => {
    expect(reason(sky(evening, { tempF: 70 }, { low: 10, high: 60 }))).toMatch(/^Sunset is at 8:3\d pm, and the forecast leaves high cloud for it to light up\./);
    expect(reason(sky(evening, { tempF: 70 }, { low: 5 }))).toMatch(/^Sunset is at 8:3\d pm under a clear sky\./);
    expect(reason(sky(evening, { tempF: 70 }, { low: 95 }))).not.toMatch(/Sunset/);
    // With no forecast at all, the time of sunset is still a fact.
    expect(reason(null)).toMatch(/^Sunset is at 8:3\d pm\. You'd be there/);
  });
});

describe('wind on the water', () => {
  const boats = option({ id: 'boats', category: 'water', setting: 'out', moods: { move: 1 } });
  const run = (wind: number, gust = wind) => match(request(noon), world({ options: [boats], weather: sky(noon, { tempF: 75 }, { wind, gust }) }));

  it('keeps the boats in when it blows', () => {
    expect(run(24).debug.rejected[0]).toMatchObject({ gate: 'weather', why: 'too windy for the water' });
    expect(run(10, 32).debug.rejected[0]).toMatchObject({ gate: 'weather' });
  });

  it('leans away in a breeze, and says so when the lake is flat', () => {
    expect(run(14).picks[0]!.parts.wind).toBeLessThan(0);
    expect(run(3).picks[0]!.parts.wind).toBeUndefined();
    const calm = match(request(noon), world({ options: [boats], weather: sky(noon, { tempF: 50 }, { wind: 3 }) }));
    expect(calm.picks[0]!.reason).toBe('Hardly any wind right now. The lake will be flat.');
  });
});

describe('the line on the opening screen', () => {
  const head = (now: number, w: Weather | null, l: Live | null = live()) => headline(now, w, l, sunOn(now), TZ);

  it('says nothing on an ordinary day, or when it knows nothing', () => {
    expect(head(at(2026, 11, 16, 10), sky(at(2026, 11, 16, 10), { tempF: 38 }, { low: 80 }))).toBeNull();
    expect(head(noon, null, null)).toBeNull();
  });

  it('leads with a warning', () => {
    const l = live({ alerts: [{ event: 'Winter Storm Warning', from: noon - HOUR, until: noon + 9 * HOUR }] });
    expect(head(noon, sky(noon, { tempF: 72 }, {}), l)).toEqual({ tag: 'Winter storm warning', tone: 'warn', line: 'Winter storm warning until 9 pm. A time for somewhere with a roof.', say: 'inside cozy', act: 'Somewhere with a roof' });
    const t = live({ alerts: [{ event: 'Tornado Warning', from: noon - HOUR, until: noon + 30 * MIN }] });
    expect(head(noon, null, t)).toEqual({ tag: 'Tornado warning', tone: 'warn', line: 'Tornado warning until 12:30 pm. Stay in. This will keep.' });
  });

  it('says when the weather is about to turn', () => {
    const w = weatherOf(noon, { tempF: 75 });
    const wet = { ...w, hours: w.hours.map((h) => (h.t >= noon + 2 * HOUR ? { ...h, code: 95 } : h)) };
    expect(head(noon, wet)).toMatchObject({ tag: 'Storms by 2 pm', tone: 'warn', line: 'Storms are due around 2 pm. Go now, or plan for indoors.' });
  });

  it('points at a good sunset while there is time to get to one', () => {
    const t = sunOn(noon).sunset - 90 * MIN;
    expect(head(t, sky(t, { tempF: 50 }, { low: 10, high: 70 }))).toMatchObject({ tag: 'Good sunset', tone: 'good', say: 'sunset outside', act: 'Find me a view west', line: expect.stringMatching(/high cloud for it to light up/) });
    expect(head(t, sky(t, { tempF: 50 }, { low: 95 }))).toBeNull();
  });

  it('notices a fine day, a flat lake, bad air and the northern lights', () => {
    expect(head(noon, sky(noon, { tempF: 72 }, { wind: 9 }))!.line).toBe('72° and dry. Days like this are for being outside.');
    expect(head(noon, sky(noon, { tempF: 72 }, { wind: 3 }))!.line).toMatch(/hardly a breath of wind/);
    expect(head(noon, sky(noon, { tempF: 72 }, {}), live({ air: [{ t: noon, aqi: 180 }] }))!.line).toMatch(/^The air is bad today \(index 180\)/);
    const night = at(2026, 11, 16, 20);
    const storm = live({ kp: [{ t: night, kp: 7.67 }] });
    expect(head(night, sky(night, { tempF: 30 }, { low: 5 }), storm)!.line).toMatch(/northern lights/);
    expect(head(night, sky(night, { tempF: 30 }, { low: 95 }), storm)).toBeNull();
    expect(head(night, sky(night, { tempF: 30 }, { low: 5 }), live({ kp: [{ t: night, kp: 4 }] }))).toBeNull();
  });
});
