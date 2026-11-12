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
import { inSeason, inSeasonAt, openIntervals, parseHours } from './hours';
import type { Intent } from './intent';
import { sunFor, type Sun } from './sun';
import { DAY, HOUR, MIN, fmtTime, toLocal } from './time';
import { GROUP, type Category, type City, type Mood, type Option } from './types';
import { VIBES, vibeFit } from './vibes';
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
  /** Unvouched places from the map. Only ever used to fill seats the main list couldn't. */
  fallback?: Option[];
}

export type Gate =
  | 'dismissed' | 'disliked' | 'today' | 'mood' | 'kids' | 'price' | 'inside' | 'far'
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
  weight: { mood: 1, vibe: 0.6, kind: 0.4, moment: 1, time: 0.25, near: 0.45, gem: 0.25, kids: 0.35, cheap: 0.3, taste: 0.25, jitter: 0.06 },
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
  closeMin: 6, // this near is worth saying out loud
  vouchGem: 0.85, // editorial weight from which "I'd vouch for it" is the reason
  freshCheckDays: 60, // hours checked by hand this recently are worth mentioning
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

/**
 * Specifically on that day, rather than always there: a dated event, or a
 * market that only sets up a few days a week. A food hall or a shop that is
 * open most days is a place, whatever its category says.
 */
export function happening(opt: Option): boolean {
  if (opt.kind === 'event') return true;
  if (opt.category !== 'market') return false;
  return (opt.rules ?? []).every((r) => parseHours(r.hours).filter((day) => day.length > 0).length <= 3);
}

function assess(opt: Option, req: Request, world: World): Candidate | Rejection {
  const { intent } = req;
  const { city, memory } = world;
  const tz = city.tz;
  const id = opt.id;

  if (req.exclude?.includes(id)) return reject(id, 'dismissed', 'you passed on it');
  const went = memory.went.get(id);
  if (went && !went.liked && req.now - went.t < TUNING.dislikedDays * DAY) return reject(id, 'disliked', "you went and weren't taken with it");
  // "Local today" is a wall: what's on, not what's always there.
  if (intent.today && !happening(opt)) return reject(id, 'today', "it's always there, not something on that day");
  if (intent.withKids && opt.kids === 0) return reject(id, 'kids', 'not a place for kids');
  if (intent.cheap && opt.price >= 3) return reject(id, 'price', 'not cheap');
  if (intent.inside && opt.setting === 'out') return reject(id, 'inside', "it's outdoors");

  const wanted = Object.entries(intent.moods) as [Mood, number][];
  let moodFit = 0;
  const kindFit = intent.kinds.includes(opt.category);
  if (wanted.length) {
    const total = wanted.reduce((s, [, w]) => s + w, 0);
    moodFit = wanted.reduce((s, [m, w]) => s + w * (opt.moods[m] ?? 0), 0) / total;
    // Asked for what's on, any event or market counts; other words only lean the order.
    if (moodFit === 0 && !kindFit && !intent.today) return reject(id, 'mood', "doesn't match what you asked for");
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
  if (opt.when || intent.today) {
    const today = toLocal(req.now, tz);
    const same = today.y === local.y && today.mo === local.mo && today.d === local.d;
    const day = same ? (hour >= 17 ? 'tonight' : 'today') : 'then';
    // A market asked for as "what's on" earns the same credit as an event.
    moments.push({ score: 0.25, line: opt.when ? `It's on ${day}, and you'd make the start.` : `It's open ${day}, and you can turn up any time.` });
  }
  moments.sort((a, b) => b.score - a.score);
  if (moments.length) parts.moment = W.moment * Math.min(0.6, moments[0]!.score + 0.3 * moments.slice(1).reduce((s, m) => s + m.score, 0));

  if (wanted.length) parts.mood = W.mood * moodFit;
  // They named this kind of place outright ("coffee", "a bar").
  if (kindFit) parts.kind = W.kind;
  const vibe = VIBES.find((v) => v.id === intent.vibe);
  // A lean, not a gate: the right feel is worth a lot, the wrong one costs a little.
  if (vibe) parts.vibe = W.vibe * vibeFit(vibe, opt.moods) || -0.15;
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
  // Two things at one address are one outing, not two.
  if (Math.abs(a.lat - b.lat) < 0.0008 && Math.abs(a.lng - b.lng) < 0.0008) p += TUNING.sameCategory;
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

/** They named this kind of place. Worded by what was asked for, never by a word they may not have used. */
const KIND_LINE: Partial<Record<Category, string>> = {
  food: 'You wanted to eat. This is a place that exists to feed you.',
  market: 'You wanted to eat. This is a market, so you can look before you choose.',
  bar: 'You wanted a drink. This is a bar, so that part is covered.',
  cafe: 'This is a cafe first and everything else second, which is what you asked for.',
  treat: "You wanted something sweet. That's this place's whole job.",
  museum: 'You wanted something to look at and think about. A museum is built for that.',
  bookstore: 'You wanted books and ideas. This is a bookstore, so start at any shelf.',
  library: 'You wanted books and ideas. A library has more of both than you can use.',
  talk: 'You wanted ideas. This is someone explaining theirs out loud.',
  music: "You wanted to be in an audience. Here it's for music.",
  show: 'You wanted to be in an audience. This is a show, so take a seat.',
  play: 'You wanted to play. This place is set up for exactly that.',
};

/**
 * What to say when nothing sharper applies: a few honest lines per family, so
 * no single one becomes wallpaper. They claim only what the family guarantees.
 */
const GROUP_LINES: Record<string, string[]> = {
  outdoors: [
    "It's close and it's outside. That's most of what you need.",
    "You'll be outdoors, which is half the reason to leave the house.",
    'Open air, and nobody setting the pace.',
    'Being outside for a while tends to fix more than it should.',
  ],
  consume: [
    'Nothing to plan. You turn up and order.',
    "It's on a short list that somebody wrote by hand.",
    'A small decision that is hard to regret.',
    "Open when you'd get there, and worth the trip on its own.",
    'The note below says what to do there. That is the whole plan.',
  ],
  mind: [
    'An hour here goes somewhere.',
    "You'll come out with something to talk about.",
    'It asks for your attention and gives something back.',
    'It gives your head something to do besides scroll.',
  ],
  lively: [
    "Something's actually happening here.",
    'A place with something on, not only somewhere to be.',
    "You won't have to make your own entertainment.",
    'It gives the outing a centre: something to do, not just somewhere to sit.',
  ],
};

const EVENT_LINES = ["Something's actually happening here.", "It's on the calendar, which most of this list isn't."];

/** The same items, started from a place that depends only on `id`: a given option tends to get the same line. */
function rotate<T>(items: T[], id: string): T[] {
  const k = items.length ? hash(id) % items.length : 0;
  return [...items.slice(k), ...items.slice(0, k)];
}

/**
 * True, checkable things about this pick for this request, each straight from
 * a field: travel time, price, hours, editorial weight, ideal stay, weather.
 * Nothing here is an opinion the data can't back.
 */
function facts(c: Candidate, req: Request, world: World): string[] {
  const o = c.option;
  const tz = world.city.tz;
  const out: string[] = [];
  if (o.when) {
    if (!o.dropIn) out.push(`It starts at ${fmtTime(c.begin, tz)}, and you're ${c.travelMin} minutes away.`);
    if (o.venue) out.push(`It's at ${o.venue}, about ${c.travelMin} minutes from where you're starting.`);
    return out;
  }
  const group = GROUP[o.category];
  const local = toLocal(c.begin, tz);
  const hour = local.h + local.mi / 60;
  const open = o.hoursTrust === 'solid' ? 'Open' : 'Usually open';
  const idealStay = o.minutes[1];
  if (c.travelMin >= 2 && c.travelMin <= TUNING.closeMin) out.push(`Only ${c.travelMin} minutes away. You could be there before you talk yourself out of it.`);
  if ((o.gem ?? 0.5) >= TUNING.vouchGem) out.push("One of the places on this list I'd vouch for hardest.");
  if (group !== 'outdoors' && c.until - c.begin < 20 * HOUR) {
    if (hour >= 21 || hour < 4) out.push(`${open} until ${fmtTime(c.until, tz)}, which isn't a given at this hour.`);
    else if (hour < 7.5 && !c.waits) out.push(`${open} this early, which most places aren't.`);
  }
  if (!req.intent.cheap && group !== 'outdoors') {
    if (o.price === 0) out.push('It costs nothing to walk in.');
    else if (o.price === 1 && o.category !== 'cafe' && o.category !== 'treat') out.push("It's on the cheap end: a few dollars covers it.");
  }
  if (o.hoursTrust === 'solid' && o.checked && Math.abs(req.now - Date.parse(o.checked)) < TUNING.freshCheckDays * DAY) {
    out.push('The hours on this card were checked by hand, not guessed.');
  }
  if (c.stayMin >= idealStay) {
    if (idealStay <= 30) out.push(`It doesn't ask for long. ${idealStay} minutes does it justice.`);
    else if (idealStay >= 90) out.push('You have enough time to do it properly, not just look in.');
  }
  if (o.setting === 'in' && c.conditions.known && (c.conditions.sky !== 'dry' || c.conditions.feelsF < 25)) {
    out.push("It's indoors, and in this weather that counts.");
  }
  return out;
}

/**
 * One reason per card, the sharpest true one: the moment, then what was asked
 * for, then a fact about this place, and only then a general line.
 * `used` holds lines already given to earlier picks: three cards never share a reason.
 */
function explain(c: Candidate, req: Request, world: World, used: Set<string>): string {
  const o = c.option;
  const lines: string[] = [];
  const top = c.moments[0];
  if (top && top.score >= 0.2) lines.push(top.line);
  const wanted = (Object.entries(req.intent.moods) as [Mood, number][])
    .map(([m, w]) => [m, w * (o.moods[m] ?? 0)] as const)
    .sort((a, b) => b[1] - a[1])[0];
  const lineFor = (m: Mood) => MOOD_LINE[m][(o.moods[m] ?? 0) >= 1 ? 0 : 1].replace('Madison', world.city.name);
  const vibe = VIBES.find((v) => v.id === req.intent.vibe);
  if (vibe && vibeFit(vibe, o.moods) >= 0.6) lines.push(vibe.line);
  const kind = req.intent.kinds.includes(o.category) ? KIND_LINE[o.category] : undefined;
  if (kind) lines.push(kind);
  if (wanted && wanted[1] > 0) lines.push(lineFor(wanted[0]));
  if (req.intent.withKids && wanted?.[0] !== 'kids' && (o.moods.kids ?? 0) > 0) lines.push(lineFor('kids'));
  if (req.intent.cheap && o.price === 0) lines.push('And it costs nothing.');
  if (world.memory.saved.includes(o.id)) lines.push("You saved this one. Now's a good time for it.");
  if (c.parts.been && c.parts.been > 0) lines.push('You liked it last time.');
  lines.push(...rotate(facts(c, req, world), o.id));
  lines.push(...rotate(o.kind === 'event' ? EVENT_LINES : GROUP_LINES[GROUP[o.category]]!, o.id));
  lines.push(`It fits the time you have: about ${c.stayMin} minutes there, ${c.travelMin} each way.`);
  // One reason. Never a list.
  const line = lines.find((l) => !used.has(l)) ?? '';
  used.add(line);
  return c.wildcard ? `The left turn. ${line}` : line;
}

const GATE_WORDS: Record<Gate, string> = {
  dismissed: 'you passed on', disliked: "you didn't love", today: "aren't on that day", mood: "don't match what you asked for",
  kids: "aren't for kids", price: "aren't cheap", inside: 'are outdoors', far: 'are too far for the time you have',
  season: 'are out of season', closed: 'are closed then', short: "wouldn't leave you enough time",
  missed: 'have already started', late: 'start too late', dark: 'need daylight', weather: "don't suit the weather",
  unconfirmed: "can't be confirmed",
};

function noteFor(picks: Candidate[], rejected: Rejection[], req: Request, world: World): string | null {
  const { intent } = req;
  const lost = intent.lost ? "I didn't follow that, so here's what's good regardless. " : '';
  if (picks.length >= 3) return lost || null;
  // Things that simply aren't what was asked for are not a reason; only count those when nothing else explains it.
  // Nor are the ordinary places a "what's on" request never meant.
  const relevant = rejected.filter((r) => r.gate !== 'dismissed' && r.gate !== 'mood' && r.gate !== 'today');
  const counted = relevant.length ? relevant : rejected.filter((r) => r.gate !== 'dismissed' && r.gate !== 'today');
  const counts = new Map<Gate, number>();
  for (const r of counted) counts.set(r.gate, (counts.get(r.gate) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
  const because = top.map(([g, n]) => `${n} ${GATE_WORDS[g]}`).join(', and ');
  if (picks.length === 0) {
    if (top[0]?.[0] === 'far') {
      // Say how far we were willing to look, and what the nearest miss was, so the fix is obvious.
      const reach = Math.round(Math.min(TUNING.maxTravelMin, req.durationMin * TUNING.maxTravelShare));
      const far = new Set(rejected.filter((r) => r.gate === 'far').map((r) => r.id));
      const nearest = world.options
        .filter((o) => far.has(o.id))
        .map((o) => ({ o, min: travelMinutes(req.origin, o, req.mode) }))
        .sort((a, b) => a.min - b.min)[0];
      const how = { walk: 'on foot', bike: 'by bike', drive: 'by car' }[req.mode];
      const next = nearest ? ` The nearest is ${nearest.o.venue ?? nearest.o.name}, about ${nearest.min} minutes away.` : '';
      const fix = req.mode === 'drive' ? 'Give it more time and it opens up.' : 'More time, or going by car, opens it up.';
      return `${lost}Nothing close enough. With the time you have I only look within about ${reach} minutes ${how}, and nothing that fits is that near where you're starting.${next} ${fix}`;
    }
    if (intent.today) {
      const known = because ? `Of the events and markets I know about, ${because}.` : "I don't know of an event or a market then.";
      return `${lost}Nothing on in the time you have. ${known} More time, or a later start, would open things up.`;
    }
    const tip = top[0]?.[0] === 'mood' ? 'Try fewer words, or just ask for a surprise.' : 'A different start time would open things up.';
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
  const chosen = choose(ranked, req, world.memory);
  const own = chosen.length;
  // Never for "what's on": a map place is an ordinary restaurant, not something happening that day.
  if (world.fallback?.length && own < 3 && !req.intent.today) {
    // The list came up short. Fill the empty seats from the map: same gates, no opinions.
    const extra: Candidate[] = [];
    for (const opt of world.fallback) {
      const a = assess(opt, req, world);
      if (!('gate' in a)) extra.push(a);
    }
    extra.sort((a, b) => b.score - a.score || a.option.id.localeCompare(b.option.id));
    chosen.push(...extra.filter((c) => req.keep?.includes(c.option.id)).slice(0, 3 - chosen.length));
    while (chosen.length < 3) {
      let best: Candidate | undefined;
      let bestValue = -Infinity;
      for (const c of extra) {
        if (chosen.includes(c)) continue;
        const value = c.score - chosen.reduce((s, x) => s + overlap(c.option, x.option), 0);
        if (value > bestValue) [best, bestValue] = [c, value];
      }
      if (!best) break;
      chosen.push(best);
    }
  }
  const borrowed = chosen.length - own;
  const picks = chosen.map((c, i) => ({
    ...c,
    reason: i < own ? explain(c, req, world, used) : `Open, and about ${c.travelMin} minutes away. Beyond that, you'd be finding out for me.`,
  }));
  const strip = ({ conditions: _c, moments: _m, moodFit: _f, ...pick }: Candidate): Pick => pick;
  return {
    picks: picks.map(strip),
    note: borrowed
      ? own === 0
        ? 'Nothing on my own list fits from where you are, so these come from the map: open and nearby, but nobody has vouched for them.'
        : `Only ${own === 1 ? 'one' : 'two'} from my own list ${own === 1 ? 'fits' : 'fit'}, so the rest ${borrowed === 1 ? 'comes' : 'come'} from the map: open and nearby, but not vouched for.`
      : noteFor(picks, rejected, req, world),
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
