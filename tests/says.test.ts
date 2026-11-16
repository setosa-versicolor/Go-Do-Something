import { describe, expect, it } from 'vitest';
import { sayReport, unheardWords, type SayRow } from '../src/core/says';
// The collector is plain JavaScript, as Cloudflare runs it.
// @ts-expect-error no types for the worker module
import { handle, tidy } from '../worker/say-log.js';

const row = (text: string, over: Partial<SayRow> = {}): SayRow => ({ hour: '2026-11-16T19:00Z', text, heard: '', lost: 0, picks: 3, minutes: 120, ...over });

describe('what people type', () => {
  it('finds the words the app stepped over', () => {
    expect(unheardWords('somewhere quiet with a fireplace', ['quiet'])).toEqual(['fireplace']);
    expect(unheardWords('I want something to do tonight', ['tonight'])).toEqual([]);
    expect(unheardWords('date night', ['date', 'night'])).toEqual([]);
  });

  it('reports how much is understood, read again with the parser as it is now', () => {
    const r = sayReport([
      row('date night'), row('Date  Night'), // understood, and the same phrase
      row('somewhere quiet with a fireplace'), // understood in part
      row('axe throwing', { lost: 1, picks: 3 }), row('axe throwing', { lost: 1 }), // lost
      row('rainy afternoon', { lost: 1 }), // lost when typed, understood now
      row('a museum at 3am', { picks: 0 }),
    ]);
    expect(r).toMatchObject({ typed: 7, distinct: 5, recovered: 1 });
    expect(r.lost).toBeCloseTo(2 / 7, 2);
    expect(r.empty).toBeCloseTo(1 / 7, 2);
    expect(r.lostPhrases).toEqual([['axe throwing', 2]]);
    expect(r.unheard.map(([w]) => w)).toEqual(expect.arrayContaining(['axe', 'throwing', 'fireplace']));
    expect(r.common[0]).toEqual(['axe throwing', 2]);
    expect(sayReport([])).toMatchObject({ typed: 0, lost: 0 });
  });
});

describe('the collector', () => {
  const SITE = 'https://dosomethingmadison.com';
  /** A stand-in for the database: remembers what was inserted. */
  const fakeEnv = (already = 0) => {
    const rows: unknown[][] = [];
    const DB = {
      prepare: (sql: string) => ({
        bind: (...args: unknown[]) => ({
          first: async () => ({ n: already }),
          run: async () => void rows.push(args),
          all: async () => ({ results: rows.map(([hour, text, heard, lost, picks, minutes]) => ({ hour, text, heard, lost, picks, minutes })), sql }),
        }),
      }),
    };
    return { env: { DB, ALLOWED_ORIGINS: `${SITE}, https://example.github.io`, EXPORT_TOKEN: 'secret' }, rows };
  };
  const post = (body: unknown, origin = SITE) => new Request('https://collector.example/say', { method: 'POST', headers: { Origin: origin, 'content-type': 'text/plain' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  const now = Date.UTC(2026, 10, 16, 19, 43, 12);

  it('keeps the words and what came of them, to the hour, and nothing else', async () => {
    const { env, rows } = fakeEnv();
    const res = await handle(post({ text: '  somewhere   quiet ', heard: ['quiet'], lost: false, picks: 3, minutes: 120, ip: '1.2.3.4', lat: 43 }), env, now);
    expect(res.status).toBe(204);
    expect(rows).toEqual([['2026-11-16T19:00Z', 'somewhere quiet', 'quiet', 0, 3, 120]]);
  });

  it('trims what it is given to what it agreed to keep', () => {
    expect(tidy({ text: 'x'.repeat(500) }).text).toHaveLength(200);
    expect(tidy({ text: 'hi', heard: ['a', 7, 'b'], lost: 1, picks: 99, minutes: 'lots' })).toEqual({ text: 'hi', heard: 'a|b', lost: 1, picks: 3, minutes: null });
    expect(tidy({ text: '   ' })).toBeNull();
    expect(tidy({ nope: true })).toBeNull();
  });

  it('takes nothing from anywhere but the site, and nothing that is not a typed request', async () => {
    const { env, rows } = fakeEnv();
    expect((await handle(post({ text: 'hello' }, 'https://elsewhere.example'), env, now)).status).toBe(403);
    expect((await handle(new Request('https://collector.example/say', { method: 'POST', body: '{"text":"hello"}' }), env, now)).status).toBe(403);
    expect((await handle(post('not json'), env, now)).status).toBe(400);
    expect((await handle(post({ text: 'x'.repeat(5000) }), env, now)).status).toBe(413);
    expect(rows).toEqual([]);
  });

  it('stops writing in a flood, quietly', async () => {
    const { env, rows } = fakeEnv(600);
    expect((await handle(post({ text: 'hello' }), env, now)).status).toBe(204);
    expect(rows).toEqual([]);
  });

  it('hands the rows over only to whoever holds the export token', async () => {
    const { env } = fakeEnv();
    await handle(post({ text: 'date night', heard: ['date', 'night'] }), env, now);
    const get = (token?: string) => handle(new Request('https://collector.example/export?since=2026-11-01T00:00Z', { headers: token ? { Authorization: `Bearer ${token}` } : {} }), env, now);
    expect((await get()).status).toBe(401);
    expect((await get('wrong')).status).toBe(401);
    const ok = await get('secret');
    expect(ok.status).toBe(200);
    expect((await ok.json()).rows).toEqual([{ hour: '2026-11-16T19:00Z', text: 'date night', heard: 'date|night', lost: 0, picks: null, minutes: null }]);
    // No token set on the collector at all: nobody gets in, not even with an empty one.
    expect((await handle(new Request('https://collector.example/export', { headers: { Authorization: 'Bearer ' } }), { ...env, EXPORT_TOKEN: '' }, now)).status).toBe(401);
  });
});
