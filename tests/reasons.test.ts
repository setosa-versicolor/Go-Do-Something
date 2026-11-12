import { describe, expect, it } from 'vitest';
import { match } from '../src/core/match';
import { GROUP } from '../src/core/types';
import { city } from '../src/cities/madison';
import { at, request, weatherOf, world } from './helpers';

// The reason on a card is the one line of judgement the person reads. If the
// same line turns up on every other card it stops meaning anything, so this
// sweeps a broad set of realistic requests over the real list and counts.
//
//   REASONS=1 npx vitest run tests/reasons.test.ts     prints the whole table

const TILES = ['food', 'drinks', 'coffee', 'outside', 'art museum books', 'music show', 'play games', 'odd', 'surprise me', ''];
const COMPANY = ['', 'date', 'friends', 'kids', 'visiting'];
const TYPED = ['date night', 'rainy afternoon', 'cheap', 'hungry', 'need to think', 'a friend is visiting', 'kids need to burn energy', 'ice cream', 'a beer with friends'];
const SAYS = [...TILES.flatMap((t, i) => [t, `${t} ${COMPANY[1 + (i % 4)]}`.trim()]), ...TYPED];
const DAYS = [[1, 17], [5, 15], [7, 8], [11, 11]] as const;
const HOURS = [8, 12, 16, 19, 22];
const ORIGINS = [city.center, ...city.starts.filter((s) => s.name === 'Hilldale' || s.name === 'the east side')];
const TRIPS = [['drive', 120], ['walk', 60], ['drive', 300], ['bike', 180]] as const;
const FEELS = [['', null], ['chill', 70], ['', 20], ['upbeat', null], ['curious', 55]] as const;

/** Numbers and clock times vary by card; the sentence around them is the reason. */
const shape = (reason: string) => reason.replace(/^The left turn\. /, '').replace(/\d+(:\d+)?( [ap]m)?°?/g, '#');

function sweep() {
  const counts = new Map<string, number>();
  /** The same count for food and drink places alone, where a stock line is most tempting. */
  const consume = new Map<string, number>();
  let consumeCards = 0;
  const shared: string[] = [];
  let cards = 0;
  let n = 0;
  for (const [mo, d] of DAYS) {
    for (const h of HOURS) {
      const start = at(2026, mo, d, h, 10);
      for (const say of SAYS) {
        for (const origin of ORIGINS) {
          // Not every combination: step through trips and feels so each request differs from its neighbours.
          const [mode, durationMin] = TRIPS[n % TRIPS.length]!;
          const [vibe, tempF] = FEELS[n % FEELS.length]!;
          n++;
          const req = request(start, say, { origin, mode, durationMin, seed: n });
          if (vibe) req.intent.vibe = vibe;
          const r = match(req, world({ weather: tempF === null ? null : weatherOf(start, { tempF }) }));
          const lines = r.picks.map((p) => p.reason.replace(/^The left turn\. /, ''));
          if (new Set(lines).size !== lines.length) shared.push(`${say} @ ${mo}/${d} ${h}:10: ${lines.join(' | ')}`);
          for (const p of r.picks) {
            cards++;
            counts.set(shape(p.reason), (counts.get(shape(p.reason)) ?? 0) + 1);
            if (GROUP[p.option.category] !== 'consume') continue;
            consumeCards++;
            consume.set(shape(p.reason), (consume.get(shape(p.reason)) ?? 0) + 1);
          }
        }
      }
    }
  }
  return { counts, cards, shared, consume, consumeCards };
}

describe('the reason on each card', () => {
  const { counts, cards, shared, consume, consumeCards } = sweep();
  const byCount = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]);
  const ranked = byCount(counts);
  const rankedConsume = byCount(consume);

  if (process.env.REASONS) {
    console.log(`${cards} cards, ${ranked.length} distinct reasons`);
    for (const [line, n] of ranked) console.log(`${((100 * n) / cards).toFixed(1).padStart(5)}%  ${String(n).padStart(5)}  ${line}`);
    console.log(`\n${consumeCards} food and drink cards, ${rankedConsume.length} distinct reasons`);
    for (const [line, n] of rankedConsume.slice(0, 12)) console.log(`${((100 * n) / consumeCards).toFixed(1).padStart(5)}%  ${String(n).padStart(5)}  ${line}`);
  }

  it('covers a broad sweep', () => {
    expect(cards).toBeGreaterThan(3000);
  });

  it('is never shared by two of the three cards', () => {
    expect(shared).toEqual([]);
  });

  it('is never one stock line: none accounts for more than 15% of cards', () => {
    const [line, n] = ranked[0]!;
    expect(n / cards, `"${line}" is on ${n} of ${cards} cards`).toBeLessThanOrEqual(0.15);
  });

  it('is always a sentence', () => {
    for (const [line] of ranked) expect(line).toMatch(/^[A-Z].{10,}[.]$/);
  });

  it('holds for food and drink places too: none accounts for more than 15% of their cards', () => {
    const [line, n] = rankedConsume[0]!;
    expect(n / consumeCards, `"${line}" is on ${n} of ${consumeCards} food and drink cards`).toBeLessThanOrEqual(0.15);
  });
});
