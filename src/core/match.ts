// The matcher. One pure function, four stages, every decision recorded:
//
//   1. assess  — hard gates. Can this person actually do this, then? If not, why not.
//   2. score   — named, additive parts. Nothing hidden in a single opaque number.
//   3. choose  — best fit, then the best *different* thing, then a left turn.
//   4. explain — one human line per pick, built from the part that mattered most.
//
// This is the only place any of that logic lives.

import type { LatLng, Mode } from './geo';
import { travelMinutes } from './geo';
import type { Memory } from './history';
import { inSeason, inSeasonAt, openIntervals } from './hours';
import type { Intent } from './intent';
import { sunFor, type Sun } from './sun';
import { DAY, HOUR, MIN, fmtTime, toLocal } from './time';
import { GROUP, type City, type Mood, type Option } from './types';
import { conditionsFor, type Conditions, type Weather } from './weather';

export interface Request {
  now: number;
  start: number;
  durationMin: number;
  origin: LatLng;
  mode: Mode;
  intent: Intent;
  /** Same seed, same world → same picks. */
  seed: number;
  /** Picks to hold in place while one is replaced. */
  keep?: string[];
  /** Turned down this session. */
  exclude?: string[];
}

export interface World {
  city: City;
  options: Option[];
  weather: Weather | null;
  memory: Memory;
}

export type Gate =
  | 'dismissed' | 'disliked' | 'mood' | 'kids' | 'price' | 'inside' | 'far'
  | 'season' | 'closed' | 'short' | 'missed' | 'late' | 'dark' | 'weather' | 'unconfirmed';

export interface Rejection {
  id: string;
  gate: Gate;
  why: string;
}

export interface Pick {
  option: Option;
  reason: string;
  wildcard: boolean;
  travelMin: number;
  /** When you'd start: arrival, opening time, or the event's start. */
  begin: number;
  stayMin: number;
  /** Closing time / end of the event. */
  until: number;
  /** It opens (or starts) after you'd arrive. */
  waits: boolean;
  score: number;
  parts: Record<string, number>;
}

export interface Result {
  picks: Pick[];
  /** Said out loud when there are fewer than three, or we didn't follow. */
  note: string | null;
  conditions: Conditions;
  sun: Sun;
  debug: { ranked: Pick[]; rejected: Rejection[] };
}

/** Every tunable number in the matcher. Change them here and nowhere else. */
export const TUNING = {
  maxTravelShare: 0.3, // one-way travel may eat this much of the window…
  maxTravelMin: 45, // …and never more than this
  maxWaitMin: 20, // willing to arrive this long before it opens
  lateGraceMin: 10, // may arrive this late to a timed event
  overrunMin: 30, // a timed event may run this far past the window
  twilightMin: 20,
  weight: { mood: 1, kind: 0.4, moment: 1, time: 0.25, near: 0.2, gem: 0.25, kids: 0.35, cheap: 0.3, taste: 0.25, jitter: 0.06 },
  shownPenalty: 0.3,
  shownQuietHours: 3, // don't reshuffle on every reload
  wentPenalty: 0.5,
  wentCooldownDays: 21,
  dislikedDays: 180,
  sameCategory: 0.6,
  sameGroup: 0.2,
  sameSetting: 0.08,
  sameHood: 0.06,
  wildcardFloor: 0.55, // a left turn must still score this share of the top pick
};

const W = TUNING.weight;

// ---------------------------------------------------------------- stage 1: assess

interface Candidate extends Pick {
  conditions: Conditions;
  moments: { score: number; line: string }[];
  moodFit: number;
}

function reject(id: string, gate: Gate, why: string): Rejection {
  return { id, gate, why };
}

function assess(opt: Option, req: Request, world: World): Candidate | Rejection {
  const { intent } = req;
  const { city, memory } = world;
  const tz = city.tz;
  const id = opt.id;

  if (req.exclude?.includes(id)) return reject(id, 'dismissed', 'you passed on it');
  const went = memory.went.get(id);
  if (went && !went.liked && req.now - went.t < TUNING.dislikedDays * DAY) return reject(id, 'disliked', "you went and weren't taken with it");
  if (intent.withKids && opt.kids === 0) return reject(id, 'kids', 'not a place for kids');
  if (intent.cheap && opt.price >= 3) return reject(id, 'price', 'not cheap');
  if (intent.inside && opt.setting === 'out') return reject(id, 'inside', "it's outdoors");

  const wanted = Object.entries(intent.moods) as [Mood, number][];
  let moodFit = 0;
  const kindFit = intent.kinds.includes(opt.category);
  if (wanted.length) {
    const total = wanted.reduce((s, [, w]) => s + w, 0);
    moodFit = wanted.reduce((s, [m, w]) => s + w * (opt.moods[m] ?? 0), 0) / total;
    if (moodFit === 0 && !kindFit) return reject(id, 'mood', "doesn't match what you asked for");
  }

  const travelMin = travelMinutes(req.origin, opt, req.mode);
  if (travelMin > Math.min(TUNING.maxTravelMin, req.durationMin * TUNING.maxTravelShare)) {
    return reject(id, 'far', `${travelMin} min each way is too much of your time`);
  }

  const arrive = req.start + travelMin * MIN;
  const leaveBy = req.start + req.durationMin * MIN - travelMin * MIN;
  const [minStay, idealStay] = opt.minutes;
  let begin: number;
  let until: number;

  if (opt.when && !opt.dropIn) {
    // A timed event: you have to be there when it starts.
    begin = opt.when.start;
    until = opt.when.end;
    if (begin < arrive - TUNING.lateGraceMin * MIN) return reject(id, 'missed', "you'd miss the start");
    if (begin > req.start + (req.durationMin * MIN) / 2) return reject(id, 'late', 'starts too late for your window');
    if (until > leaveBy + TUNING.overrunMin * MIN) return reject(id, 'short', 'runs longer than you have');
  } else {
    if (!inSeasonAt(opt, arrive, tz)) return reject(id, 'season', 'out of season');
    const intervals = openIntervals(opt, arrive, leaveBy, tz);
    const iv = intervals.find(([s, e]) => s <= arrive + TUNING.maxWaitMin * MIN && e > arrive);
    if (!iv) return reject(id, 'closed', intervals.length ? 'not open until later' : 'closed then');
    begin = Math.max(arrive, iv[0]);
    until = iv[1];
    if (Math.min(until, leaveBy) - begin < minStay * MIN) {
      return reject(id, 'short', until < leaveBy ? 'closes too soon after you arrive' : 'not enough time once you get there');
    }
  }

  const available = Math.max(0, (Math.min(until, Math.max(leaveBy, begin)) - begin) / MIN);
  let stayMin = Math.round(Math.min(idealStay, opt.when && !opt.dropIn ? (until - begin) / MIN : available));

  // Daylight and weather are judged for the time you'd actually be there.
  const sun = sunFor(begin, opt.lat, opt.lng, tz);
  const conditions = conditionsFor(world.weather, begin, begin + stayMin * MIN);
  const twilight = TUNING.twilightMin * MIN;
  if (opt.needs?.includes('daylight')) {
    const lightLeft = (sun.sunset + twilight - begin) / MIN;
    if (begin < sun.sunrise - twilight || lightLeft < minStay) return reject(id, 'dark', "it'd be dark");
    stayMin = Math.min(stayMin, Math.round(lightLeft));
  }
  if (opt.needs?.includes('snow')) {
    // We only send someone sledding if we can see snow on the ground.
    if (!conditions.known) return reject(id, 'unconfirmed', "can't confirm there's snow");
    if (conditions.snowIn < 3) return reject(id, 'weather', 'not enough snow');
  }
  if (conditions.known) {
    if (opt.setting === 'out') {
      if (conditions.sky === 'storm') return reject(id, 'weather', 'storms');
      if (conditions.sky === 'wet') return reject(id, 'weather', "it's coming down");
      if (conditions.feelsF < 0 && !opt.best?.includes('snow')) return reject(id, 'weather', 'dangerously cold');
    }
    if (opt.needs?.includes('warm') && conditions.feelsF < 66) return reject(id, 'weather', 'too cold for it');
    if (opt.needs?.includes('mild') && conditions.feelsF < 45) return reject(id, 'weather', 'too cold to enjoy');
  }

  // ------------------------------------------------------------ stage 2: score

  const parts: Record<string, number> = {};
  const moments: Candidate['moments'] = [];
  const local = toLocal(begin, tz);
  const hour = local.h + local.mi / 60;
  const end = begin + stayMin * MIN;
  const outdoorsy = opt.setting !== 'in';
  const daylight = begin > sun.sunrise && begin < sun.sunset;
  const dryEnough = !conditions.known || conditions.sky === 'dry';

  if (opt.best?.includes('sunset') && dryEnough && begin <= sun.sunset - 10 * MIN && end >= sun.sunset - 5 * MIN) {
    const spare = Math.round((sun.sunset - begin) / MIN);
    moments.push({ score: 0.5, line: `Sunset is at ${fmtTime(sun.sunset, tz)}. You'd be there ${spare} minutes ahead of it.` });
  }
  if (opt.best?.includes('sunrise') && dryEnough && begin <= sun.sunrise + 10 * MIN && end >= sun.sunrise) {
    moments.push({ score: 0.5, line: `Sunrise is at ${fmtTime(sun.sunrise, tz)}. Almost nobody sees it from here. You could.` });
  }
  for (const m of opt.moments ?? []) {
    if (inSeason(m.season, local.mo, local.d)) moments.push({ score: 0.45, line: m.line });
  }
  if (conditions.known) {
    const feels = Math.round(conditions.feelsF);
    if (opt.best?.includes('snow') && conditions.snowIn >= 3) moments.push({ score: 0.4, line: "There's snow on the ground. This is what it's for." });
    if (opt.best?.includes('hot') && conditions.feelsF >= 84) moments.push({ score: 0.4, line: `It feels like ${feels}° out. This is the fix.` });
    if (outdoorsy && daylight && conditions.sky === 'dry' && conditions.feelsF >= 55 && conditions.feelsF <= 84) {
      moments.push({ score: opt.setting === 'out' ? 0.3 : 0.2, line: `It's ${Math.round(conditions.tempF)}° and dry. Days like this are for being outside.` });
    }
    if (opt.setting === 'in' && (opt.moods.cozy ?? 0) > 0) {
      if (conditions.sky !== 'dry') moments.push({ score: 0.35, line: `It's ${conditions.summary.split(' and ')[1]}. This is where you wait it out.` });
      else if (conditions.feelsF < 25) moments.push({ score: 0.3, line: `It feels like ${feels}° out there. In here it doesn't.` });
    }
    if (opt.setting === 'out' && conditions.sky === 'damp') parts.drizzle = -0.2;
    if (opt.setting === 'out' && conditions.feelsF < 25 && !opt.best?.includes('snow')) parts.cold = -0.2;
  }
  if (opt.best?.includes('morning') && hour >= 5 && hour < 10.5) moments.push({ score: 0.2, line: "It's at its best in the morning, and it's morning." });
  if (opt.best?.includes('night') && (hour >= 20 || hour < 3)) moments.push({ score: 0.2, line: 'It gets better after dark, and it is.' });
  if (opt.when) {
    const today = toLocal(req.now, tz);
    const same = today.y === local.y && today.mo === local.mo && today.d === local.d;
    moments.push({ score: 0.25, line: same ? `Only happening ${hour >= 17 ? 'tonight' : 'today'}.` : "It's a one-time thing. It won't be there next week." });
  }
  moments.sort((a, b) => b.score - a.score);
  if (moments.length) parts.moment = W.moment * Math.min(0.6, moments[0]!.score + 0.3 * moments.slice(1).reduce((s, m) => s + m.score, 0));

  if (wanted.length) parts.mood = W.mood * moodFit;
  // They named this kind of place outright ("coffee", "a bar").
  if (kindFit) parts.kind = W.kind;
  parts.time = W.time * Math.min(1, stayMin / idealStay);
  // A fifteen-minute curiosity is thin for a whole afternoon.
  if (idealStay < (req.durationMin - 2 * travelMin) * 0.25) parts.slight = -0.1;
  parts.near = W.near * (1 - travelMin / Math.min(TUNING.maxTravelMin, req.durationMin * TUNING.maxTravelShare));
  parts.gem = W.gem * (opt.gem ?? 0.5);
  if (intent.withKids && opt.kids === 2) parts.kids = W.kids;
  if (intent.cheap) parts.cheap = W.cheap * [1, 0.5, -0.35][opt.price]!;

  const affinity = memory.affinity[opt.category];
  if (affinity) parts.taste = W.taste * affinity;
  const shown = memory.lastShown.get(id);
  if (shown !== undefined && req.now - shown > TUNING.shownQuietHours * HOUR) {
    parts.seen = -TUNING.shownPenalty * 0.5 ** ((req.now - shown) / (3 * DAY));
  }
  if (went?.liked) {
    parts.been = req.now - went.t < TUNING.wentCooldownDays * DAY ? -TUNING.wentPenalty : 0.1;
  }
  const skips = (memory.skips.get(id) ?? []).filter((t) => req.now - t < 30 * DAY).length;
  if (skips) parts.skipped = -0.15 * Math.min(3, skips);
  if (memory.saved.includes(id)) parts.saved = 0.2;
  parts.jitter = W.jitter * (random(hash(id) ^ req.seed)() - 0.5);

  const score = Object.values(parts).reduce((s, v) => s + v, 0);
  return {
    option: opt, reason: '', wildcard: false, travelMin, begin, stayMin, until,
    waits: begin > arrive + MIN, score, parts, conditions, moments, moodFit,
  };
}

// ---------------------------------------------------------------- stage 3: choose

function overlap(a: Option, b: Option): number {
  let p = 0;
  if (a.category === b.category) p += TUNING.sameCategory;
  else if (GROUP[a.category] === GROUP[b.category]) p += TUNING.sameGroup;
  if (a.setting === b.setting) p += TUNING.sameSetting;
  if (a.hood === b.hood) p += TUNING.sameHood;
  return p;
}

function choose(ranked: Candidate[], req: Request, memory: Memory): Candidate[] {
  const chosen = ranked.filter((c) => req.keep?.includes(c.option.id));
  const replacing = (req.keep?.length ?? 0) > 0;
  const rng = random(req.seed);
  while (chosen.length < 3) {
    const pool = ranked.filter((c) => !chosen.includes(c));
    if (pool.length === 0) break;
    const top = ranked[0]!.score;

    // The third pick is a left turn: still a real fit, but not the obvious next one.
    if (chosen.length === 2 && !replacing) {
      const turns = pool.filter(
        (c) => c.score >= top * TUNING.wildcardFloor && chosen.every((x) => x.option.category !== c.option.category),
      );
      if (turns.length > 1) {
        const weights = turns.map((c) => {
          const fresh = memory.lastShown.has(c.option.id) ? 1 : 1.5;
          const elsewhere = chosen.every((x) => GROUP[x.option.category] !== GROUP[c.option.category]) ? 2 : 1;
          return Math.max(0.01, c.score) ** 2 * fresh * elsewhere;
        });
        let r = rng() * weights.reduce((s, w) => s + w, 0);
        const turn = turns.find((_, i) => (r -= weights[i]!) <= 0) ?? turns[0]!;
        chosen.push({ ...turn, wildcard: turn !== pool[0] });
        continue;
      }
    }

    let best = pool[0]!;
    let bestValue = -Infinity;
    for (const c of pool) {
      const value = c.score - chosen.reduce((s, x) => s + overlap(c.option, x.option), 0);
      if (value > bestValue) [best, bestValue] = [c, value];
    }
    chosen.push(best);
  }
  return chosen;
}

// ---------------------------------------------------------------- stage 4: explain

/** [what it's for, also good for] — the softer line is used when the fit is partial. */
const MOOD_LINE: Record<Mood, [string, string]> = {
  think: ["You wanted quiet. This is the kind you don't have to ask for.", "Not silent, but there's room to be left alone."],
  date: ["Made for two people who'd rather talk than look at their phones.", 'Works for two, if you let it.'],
  kids: ['Built with kids in mind. They can be themselves here.', 'Kids are welcome here, not just tolerated.'],
  showoff: ['This is the Madison you want a visitor to go home talking about.', 'A good one to show somebody from out of town.'],
  move: ["You'll use your legs and forget you meant to.", 'Some moving involved, none of it punishing.'],
  eat: ["You're hungry. This is worth being hungry for.", "There's food, and it's better than it needs to be."],
  drink: ['A proper drink, no performance required.', 'You can get a drink here, and a decent one.'],
  learn: ["You'll leave knowing something you didn't.", 'You might learn something by accident.'],
  nature: ["Real trees, real water, closer than you'd think.", "More green than you'd expect this close in."],
  cozy: ['Warm, dry, and in no hurry to move you along.', 'Indoors, and nobody will rush you.'],
  lively: ['Other people, some noise, a reason to stay out.', "There'll be people around, in the good way."],
  odd: ["You wouldn't have thought of it. That's the point.", 'A little off the usual list.'],
};

const GROUP_LINE: Record<string, string> = {
  outdoors: "It's close and it's outside. That's most of what you need.",
  consume: 'Close, open, and very good at one thing.',
  mind: 'An hour here goes somewhere.',
  lively: "Something's actually happening here.",
};

/** `used` holds lines already given to earlier picks: three cards never share a reason. */
function explain(c: Candidate, req: Request, world: World, used: Set<string>): string {
  let lines: string[] = [];
  const top = c.moments[0];
  if (top && top.score >= 0.2) lines.push(top.line);
  const wanted = (Object.entries(req.intent.moods) as [Mood, number][])
    .map(([m, w]) => [m, w * (c.option.moods[m] ?? 0)] as const)
    .sort((a, b) => b[1] - a[1])[0];
  const lineFor = (m: Mood) => MOOD_LINE[m][(c.option.moods[m] ?? 0) >= 1 ? 0 : 1].replace('Madison', world.city.name);
  if (wanted && wanted[1] > 0) lines.push(lineFor(wanted[0]));
  if (req.intent.withKids && wanted?.[0] !== 'kids' && (c.option.moods.kids ?? 0) > 0) lines.push(lineFor('kids'));
  if (req.intent.cheap && c.option.price === 0) lines.push('And it costs nothing.');
  if (world.memory.saved.includes(c.option.id)) lines.push("You saved this one. Now's a good time for it.");
  if (c.parts.been && c.parts.been > 0) lines.push('You liked it last time.');
  lines.push(GROUP_LINE[GROUP[c.option.category]]!);
  lines.push(`It fits the time you have: about ${c.stayMin} minutes there, ${c.travelMin} each way.`);
  lines = lines.filter((l) => !used.has(l));
  // One reason. Never a list.
  lines = lines.slice(0, 1);
  for (const l of lines) used.add(l);
  const line = lines.join(' ');
  return c.wildcard ? `The left turn. ${line}` : line;
}

const GATE_WORDS: Record<Gate, string> = {
  dismissed: 'you passed on', disliked: "you didn't love", mood: "don't match what you asked for",
  kids: "aren't for kids", price: "aren't cheap", inside: 'are outdoors', far: 'are too far for the time you have',
  season: 'are out of season', closed: 'are closed then', short: "wouldn't leave you enough time",
  missed: 'have already started', late: 'start too late', dark: 'need daylight', weather: "don't suit the weather",
  unconfirmed: "can't be confirmed",
};

function noteFor(picks: Candidate[], rejected: Rejection[], intent: Intent): string | null {
  const lost = intent.lost ? "I didn't follow that, so here's what's good regardless. " : '';
  if (picks.length >= 3) return lost || null;
  const counts = new Map<Gate, number>();
  for (const r of rejected) if (r.gate !== 'dismissed') counts.set(r.gate, (counts.get(r.gate) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
  const because = top.map(([g, n]) => `${n} ${GATE_WORDS[g]}`).join(', and ');
  if (picks.length === 0) {
    const tip =
      top[0]?.[0] === 'far' ? 'More time, or a faster way to get around, would open things up.'
      : top[0]?.[0] === 'mood' ? 'Try fewer words, or just ask for a surprise.'
      : 'A different start time would open things up.';
    return `${lost}Nothing honest to suggest for that. Of the places I know, ${because || 'none fit'}. ${tip}`;
  }
  const n = picks.length === 1 ? 'one thing' : 'two things';
  return `${lost}Only ${n} really fit${picks.length === 1 ? 's' : ''} right now${because ? ` (${because})` : ''}. Better that than filler.`;
}

// ---------------------------------------------------------------- the one entry point

export function match(req: Request, world: World): Result {
  const ranked: Candidate[] = [];
  const rejected: Rejection[] = [];
  for (const opt of world.options) {
    const a = assess(opt, req, world);
    if ('gate' in a) rejected.push(a);
    else ranked.push(a);
  }
  ranked.sort((a, b) => b.score - a.score || a.option.id.localeCompare(b.option.id));
  const used = new Set<string>();
  const picks = choose(ranked, req, world.memory).map((c) => ({ ...c, reason: explain(c, req, world, used) }));
  const strip = ({ conditions: _c, moments: _m, moodFit: _f, ...pick }: Candidate): Pick => pick;
  return {
    picks: picks.map(strip),
    note: noteFor(picks, rejected, req.intent),
    conditions: conditionsFor(world.weather, req.start, req.start + req.durationMin * MIN),
    sun: sunFor(req.start, world.city.center.lat, world.city.center.lng, world.city.tz),
    debug: { ranked: ranked.map(strip), rejected },
  };
}

/** "Open until 9 pm" — hedged with "usually" whenever the hours aren't verified. */
export function statusLine(pick: Pick, now: number, tz: string): string {
  const { option: opt } = pick;
  const usually = opt.hoursTrust === 'solid' ? '' : 'usually ';
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  if (opt.when && !opt.dropIn) return `Starts at ${fmtTime(pick.begin, tz)}`;
  const future = pick.begin - now > 30 * MIN;
  const closes = (pick.until - pick.begin) / MIN > 20 * 60 ? 'all day' : `until ${fmtTime(pick.until, tz)}`;
  if (pick.waits) return cap(`${usually}opens at ${fmtTime(pick.begin, tz)}, ${closes}`);
  const soon = pick.until - pick.begin < 60 * MIN ? ` (${Math.round((pick.until - pick.begin) / MIN)} min after you arrive)` : '';
  return cap(`${usually}open ${future ? 'then, ' : ''}${closes}${soon}`);
}

// ---------------------------------------------------------------- small deterministic helpers

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
