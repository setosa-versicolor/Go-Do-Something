// What do people type, and how much of it does the app understand? Pure
// measurement over the rows the collector keeps (worker/). Each phrase is
// read again with today's parser, so the numbers show where the app stands
// now, not where it stood when the phrase was typed.

import { parseIntent } from './intent';

export interface SayRow {
  hour: string;
  text: string;
  /** What the app understood at the time, joined with |. */
  heard: string;
  lost: number;
  picks: number | null;
  minutes: number | null;
}

export interface SayReport {
  typed: number;
  distinct: number;
  /** Share the app understood none of. The headline number: these people got a guess. */
  lost: number;
  /** Share it understood only in part: some words taken in, others ignored. */
  partly: number;
  /** Share that came back with no picks at all. */
  empty: number;
  /** Phrases it is lost on now, commonest first. */
  lostPhrases: [string, number][];
  /** Words it steps over, commonest first: what the vocabulary is missing. */
  unheard: [string, number][];
  /** The commonest things typed. */
  common: [string, number][];
  /** Lost when typed, understood now: what earlier fixes bought. */
  recovered: number;
}

// Words that carry no request on their own.
const SMALL = new Set(('a an and the of to in on at for with my me i we us our you your it its is are be do does want wants need needs like would could can something somewhere some any place places thing things ' +
  'that this there here go going get find show give looking look feel feeling up out so but or not no just really very maybe please good nice great best near nearby around today tonight now then time have has got im i’m i\'m lets let’s').split(' '));

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
const top = (m: Map<string, number>, n: number): [string, number][] => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
const round = (n: number) => Math.round(n * 1000) / 1000;

/** The words in a phrase that no understood phrase covers. */
export function unheardWords(text: string, heard: string[]): string[] {
  let rest = ` ${norm(text)} `;
  for (const h of [...heard].sort((a, b) => b.length - a.length)) rest = rest.split(norm(h)).join(' ');
  return rest.split(/[^a-z0-9'’-]+/).filter((w) => w.length > 2 && !SMALL.has(w) && !/^\d+$/.test(w));
}

export function sayReport(rows: SayRow[], limit = 25): SayReport {
  const n = rows.length;
  const count = { lost: 0, partly: 0, empty: 0, recovered: 0 };
  const lostPhrases = new Map<string, number>();
  const unheard = new Map<string, number>();
  const common = new Map<string, number>();
  for (const r of rows) {
    const text = norm(r.text);
    const now = parseIntent(text);
    common.set(text, (common.get(text) ?? 0) + 1);
    const missed = unheardWords(text, now.heard);
    if (now.lost) {
      count.lost++;
      lostPhrases.set(text, (lostPhrases.get(text) ?? 0) + 1);
    } else if (missed.length) count.partly++;
    if (r.lost && !now.lost) count.recovered++;
    if (r.picks === 0) count.empty++;
    for (const w of new Set(missed)) unheard.set(w, (unheard.get(w) ?? 0) + 1);
  }
  const share = (k: number) => (n === 0 ? 0 : round(k / n));
  return {
    typed: n, distinct: common.size, lost: share(count.lost), partly: share(count.partly), empty: share(count.empty),
    lostPhrases: top(lostPhrases, limit), unheard: top(unheard, limit), common: top(common, limit), recovered: count.recovered,
  };
}
