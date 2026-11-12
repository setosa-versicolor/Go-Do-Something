// Turn whatever the person said — typed words or tapped chips, which are just
// canned words — into a structured Intent. One parser, one path. Deterministic
// and inspectable: `heard` lists exactly which phrases were understood.

import type { Category, Mood } from './types';
import { fromLocal, localDatePlus, toLocal } from './time';

export interface StartHint {
  /** Days from today, or a weekday 0-6 to find next. */
  dayOffset?: number;
  weekday?: number;
  /** Minutes from midnight. */
  at?: number;
}

export interface Intent {
  moods: Partial<Record<Mood, number>>;
  /** Kinds of place asked for by name ("coffee", "a bar", "a museum"). A boost, never a wall. */
  kinds: Category[];
  withKids: boolean;
  cheap: boolean;
  inside: boolean;
  surprise: boolean;
  /** A vibe id from vibes.ts. A lean, never a wall. */
  vibe?: string;
  durationMin?: number;
  start?: StartHint;
  /** Phrases we understood, for the UI ("Heard: …") and debugging. */
  heard: string[];
  /** The person said something and we understood none of it. Never silent. */
  lost: boolean;
}

interface Entry {
  re: RegExp;
  moods?: Partial<Record<Mood, number>>;
  kinds?: Category[];
  flag?: 'withKids' | 'cheap' | 'inside' | 'surprise';
}

// Order doesn't matter; every entry is tried. Keep phrases human, not clever.
const LEXICON: Entry[] = [
  { re: /\b(think|clear my head|quiet|alone|solo|by myself|peace|calm|reflect|decompress|read(ing)?|journal|write|writing|sad|stressed|overwhelmed|restless)\b/, moods: { think: 1 } },
  { re: /\b(date|romantic|anniversary|girlfriend|boyfriend|wife|husband|partner|impress)\b/, moods: { date: 1 } },
  { re: /\b(kids?|child(ren)?|toddlers?|family|son|daughter|nephew|niece|little ones?)\b/, moods: { kids: 1 }, flag: 'withKids' },
  { re: /\b(visit(ing|or|ors)?|in town|out[- ]of[- ]town(ers?)?|guests?|parents|show (them|him|her) (around|madison)|tourist|first time)\b/, moods: { showoff: 1 } },
  { re: /\b(burn (off )?energy|walk|hike|run|bike|ride|paddle|kayak|swim|exercise|active|move|stretch my legs|sled(ding)?|ski)\b/, moods: { move: 1 } },
  { re: /\b(hungry|eat|food|lunch|dinner|breakfast|brunch|bite|snack|starving)\b/, moods: { eat: 1 }, kinds: ['food', 'market'] },
  { re: /\b(drinks?|beer|cocktails?|bar|wine|pint|nightcap|brewery|nightcap)\b/, moods: { drink: 1 }, kinds: ['bar'] },
  { re: /\b(coffee|cafe|café|tea|espresso|caffeine)\b/, moods: { cozy: 0.7, think: 0.5 }, kinds: ['cafe'] },
  { re: /\b(ice cream|dessert|sweet|treat|donuts?|pastry)\b/, moods: { eat: 0.8 }, kinds: ['treat'] },
  { re: /\b(learn|museum|art|history|science|culture|books?|bookstore|library|lecture|curious|nerd(y)?|ideas|gallery|exhibit\w*|talk|reading)\b/, moods: { learn: 1 }, kinds: ['museum', 'bookstore', 'library', 'talk'] },
  { re: /\b(outside|outdoors?|nature|fresh air|trees|woods|lake|water|park|sun(ny|shine)?|sunset|sunrise|birds?|stars)\b/, moods: { nature: 1 } },
  { re: /\b(rain(y|ing)?|cold|freezing|snow(y|ing)?|cozy|warm up|hide|shelter|gloomy|grey|gray)\b/, moods: { cozy: 1 } },
  { re: /\b(inside|indoors?|rain(y|ing)?|storm(y|ing)?)\b/, flag: 'inside' },
  { re: /\b(friends?|group|people|music|live|show|concert|dance|loud|fun|party|social|celebrat\w+|birthday|crowd)\b/, moods: { lively: 1 } },
  { re: /\b(music|concert|band|jazz|show|comedy|theat(er|re)|film|movie|stage)\b/, moods: { lively: 1 }, kinds: ['music', 'show'] },
  { re: /\b(play|games?|arcade|pinball|bowling|mini ?golf|climb(ing)?)\b/, moods: { lively: 0.6, move: 0.5 }, kinds: ['play'] },
  { re: /\b(weird|odd|strange|different|unusual|hidden|secret|never been|new to me|bored)\b/, moods: { odd: 1 } },
  // "a free evening" is about time, not money.
  { re: /\b(cheap|free(?! (hour|time|evening|afternoon|morning|day|night|weekend|minute|sat|sun|mon|tue|wed|thu|fri)\w*)|broke|no money|budget|inexpensive)\b/, flag: 'cheap' },
  { re: /\b(surprise( me)?|anything|whatever|dealer'?s choice|you pick|don'?t care|no idea)\b/, flag: 'surprise' },
];

const NUMBER: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, couple: 2, few: 3 };
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const PART: Record<string, number> = { morning: 9 * 60, afternoon: 13 * 60, evening: 18 * 60, night: 19 * 60 };

function parseDuration(text: string, heard: string[]): number | undefined {
  let m = /\bhalf an? hour\b/.exec(text);
  if (m) return heard.push(m[0]), 30;
  m = /\b(\d+(?:\.\d+)?|an?|one|two|three|four|five|six|couple|few)(?: of)?[ -]?(hours?|hrs?|h|minutes?|mins?)\b/.exec(text);
  if (m) {
    const n = NUMBER[m[1]!] ?? Number(m[1]);
    heard.push(m[0]);
    return Math.round(m[2]!.startsWith('h') ? n * 60 : n);
  }
  m = /\b(all|whole) (day|afternoon|morning|evening)\b/.exec(text);
  if (m) return heard.push(m[0]), m[2] === 'day' ? 360 : 240;
  m = /\b(quick|short|brief)\b/.exec(text);
  if (m) return heard.push(m[0]), 45;
  return undefined;
}

function parseStart(text: string, heard: string[]): StartHint | undefined {
  const hint: StartHint = {};
  let m = /\b(tonight|this evening)\b/.exec(text);
  if (m) {
    heard.push(m[0]);
    return { dayOffset: 0, at: PART.evening };
  }
  m = /\btomorrow\b/.exec(text);
  if (m) {
    heard.push(m[0]);
    hint.dayOffset = 1;
  }
  m = new RegExp(`\\b(${WEEKDAYS.join('|')})\\b`).exec(text);
  if (m) {
    heard.push(m[0]);
    hint.weekday = WEEKDAYS.indexOf(m[1]!);
  }
  m = /\b(?:this |in the |at )?(morning|afternoon|evening|night)\b/.exec(text);
  if (m) {
    heard.push(m[1]!);
    hint.at = PART[m[1]!];
  }
  return hint.dayOffset !== undefined || hint.weekday !== undefined || hint.at !== undefined ? hint : undefined;
}

export function parseIntent(raw: string): Intent {
  const text = raw.toLowerCase().replace(/[’]/g, "'").trim();
  const intent: Intent = { moods: {}, kinds: [], withKids: false, cheap: false, inside: false, surprise: false, heard: [], lost: false };
  for (const e of LEXICON) {
    const m = e.re.exec(text);
    if (!m) continue;
    intent.heard.push(m[0]);
    if (e.flag) intent[e.flag] = true;
    for (const k of e.kinds ?? []) if (!intent.kinds.includes(k)) intent.kinds.push(k);
    for (const [mood, w] of Object.entries(e.moods ?? {}) as [Mood, number][]) {
      intent.moods[mood] = Math.max(intent.moods[mood] ?? 0, w);
    }
  }
  intent.durationMin = parseDuration(text, intent.heard);
  intent.start = parseStart(text, intent.heard);
  // "Surprise me" wins over any accidental mood words.
  if (intent.surprise) {
    intent.moods = {};
    intent.kinds = [];
  }
  intent.heard = [...new Set(intent.heard)];
  intent.lost = text.length > 0 && intent.heard.length === 0;
  return intent;
}

/**
 * Resolve a start hint to an instant in the city's zone. A time that has
 * already passed today means "now" (never the past).
 */
export function resolveStart(hint: StartHint | undefined, now: number, tz: string): number {
  if (!hint) return now;
  let offset = hint.dayOffset ?? 0;
  if (hint.weekday !== undefined) {
    const today = toLocal(now, tz).dow;
    offset = (hint.weekday - today + 7) % 7;
  }
  const date = localDatePlus(now, offset, tz);
  const at = hint.at ?? (offset === 0 ? undefined : 10 * 60);
  if (at === undefined) return now;
  const t = fromLocal(date.y, date.mo, date.d, at, tz);
  if (t > now) return t;
  // Named weekday is today but that part of the day is gone: next week.
  if (hint.weekday !== undefined && hint.dayOffset === undefined) {
    const next = localDatePlus(now, 7, tz);
    return fromLocal(next.y, next.mo, next.d, at, tz);
  }
  return now;
}
