import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { city, places, shape } from '../cities/madison';
import { loadEvents, SOURCES } from '../core/events';
import { loadNearby } from '../core/nearby';
import { directionsUrl, miles, offsetMiles, travelLabel, type LatLng, type Mode } from '../core/geo';
import { append, MAX_SAVED, pendingCheckIn, summarize, type Entry, type Verb } from '../core/history';
import { parseIntent, resolveStart } from '../core/intent';
import { match, statusLine, type Pick, type Request, type Result } from '../core/match';
import { sunFor } from '../core/sun';
import { DAY, HOUR, MIN, fmtDay, fmtTime, parseLocalInput, toLocal, toLocalInput } from '../core/time';
import { GROUP, type Option } from '../core/types';
import { conditionsFor, fetchWeather, type Weather } from '../core/weather';
import type { Diorama, Live, Pin, Pose, SkyInput } from './scene';
import { partOfDay, skyAt } from './sky';
import { Intro } from './intro';
import { VibeIcon, vibeLabel, VibeSheet } from './vibe';
import { forgetEverything, loadLog, loadBeams, loadMode, loadStart, loadTheme, markIntroSeen, saveLog, saveBeams, saveMode, saveStart, saveTheme, seenIntro, type Theme } from './store';

const tz = city.tz;

// Tiles and pills are just canned words: they go through the same parser as typing does.
// Labels stay broad on purpose. A tile names a kind of outing, never a taste.
const MOODS: [label: string, line: string, say: string][] = [
  ['Food', 'a snack to a real dinner', 'food'],
  ['Drinks', 'dives to cocktail bars', 'drinks'],
  ['Coffee', 'and somewhere to sit', 'coffee'],
  ['Outside', 'a walk, a view, water', 'outside'],
  ['Art & ideas', 'museums, books, talks', 'art museum books'],
  ['Music & shows', "whatever's on a stage", 'music show'],
  ['Play', 'games and climbing', 'play games'],
  ['Something odd', 'off the usual list', 'odd'],
  // The one tile that is a wall, not a lean: only dated events and markets (intent.today).
  ['Local today', "markets and what's on", 'local today'],
];
const COMPANY: [label: string, say: string][] = [['Just me', ''], ['A date', 'date'], ['Friends', 'friends'], ['Kids', 'kids'], ['A visitor', 'visiting']];
// The page can't ask again once a phone or browser has said no, so say where the switch is.
const BLOCKED = /iPhone|iPad|iPod/.test(navigator.userAgent)
  ? 'Your phone isn’t letting this browser share a location. In the Settings app, go to Privacy & Security › Location Services, find this browser in the list, choose “While Using the App”, then come back and reload.'
  : /Android/.test(navigator.userAgent)
    ? 'Location is turned off for this site. Tap the icon beside the address, open Permissions, allow Location, then reload.'
    : 'Location is turned off for this site. Click the icon beside the address, allow Location, then reload.';

const DURATIONS: [number, string, string][] = [[60, 'An hour', 'in and out'], [120, 'Two hours', 'room to linger'], [180, 'Three hours', 'a proper outing'], [300, 'Half the day', 'no rush at all']];
const STARTS: [string, string][] = [['now', 'now'], ['tonight', 'tonight'], ['tomorrow morning', 'tomorrow morning'], ['saturday morning', 'Saturday morning'], ['pick', 'at a time I pick…']];
const MODES: [Mode, string][] = [['walk', 'on foot'], ['bike', 'by bike'], ['drive', 'by car']];
const THINKING = ["Checking what's open…", 'Looking at the sky…', 'Leaving out the obvious…'];
const COUNT = ['Nothing', 'One', 'Two', 'Three'];
/** `?weather=snow` (or rain, storm, fog, clear) dresses the model for weather we aren't having, to look at it. The picks still use the real forecast. */
const PREVIEW: Record<string, Partial<SkyInput>> = {
  fog: { wet: 0, fog: 1, snowing: false, storm: false, snowIn: 0, frozen: false },
  snow: { wet: 0.85, snowing: true, storm: false, snowIn: 4, frozen: true },
  rain: { wet: 0.85, snowing: false, storm: false, snowIn: 0, frozen: false },
  storm: { wet: 1, snowing: false, storm: true, snowIn: 0, frozen: false },
  clear: { wet: 0, snowing: false, storm: false, snowIn: 0, frozen: false },
};
const PIN_COLOR: Record<string, string> = { outdoors: '#2fa58a', consume: '#e08a3c', mind: '#8a6fd0', lively: '#e0567a' };

type Stage = 'mood' | 'time' | 'thinking' | 'results';

interface View {
  req: Request;
  result: Result;
  options: Option[];
  label: string;
}

export function App() {
  const [stage, setStage] = useState<Stage>('mood');
  const [mood, setMood] = useState<string>(''); // the canned words of the chosen tile
  const [company, setCompany] = useState<string | null>(null); // label of the chosen pill
  const [text, setText] = useState('');
  const [duration, setDuration] = useState(120);
  const [startKey, setStartKey] = useState('now');
  const [custom, setCustom] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>(loadMode);
  // Where travel is measured from: '' is the city center, 'me' is the device, anything else is a named area.
  const [startFrom, setStartFrom] = useState<string>(() => (city.starts.some((s) => s.name === loadStart()) ? loadStart() : ''));
  const [here, setHere] = useState<LatLng | null>(null);
  const [finding, setFinding] = useState(false);
  /** Why the device wouldn't give a location, and what to do about it. Stays up until they choose again. */
  const [locHelp, setLocHelp] = useState('');
  const origin: LatLng | null = startFrom === 'me' ? here : city.starts.find((s) => s.name === startFrom) ?? null;
  const [log, setLog] = useState<Entry[]>(loadLog);
  const [view, setView] = useState<View | null>(null);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [shuffles, setShuffles] = useState(0);
  const [line, setLine] = useState(0);
  const [sheet, setSheet] = useState(false);
  // The introduction plays on the first visit, and again from the "?" button.
  const [intro, setIntro] = useState(() => !seenIntro() && !/^#\/p\//.test(location.hash));
  const [beams, setBeams] = useState(loadBeams);
  // The introduction waits for the page to be shown (below). If the model never draws (no WebGL), that still happens, over the painted sky.
  const [sceneReady, setSceneReady] = useState(false);
  // The page holds back until the model has drawn and the weather is in (or a few seconds pass), then everything
  // appears at once, instead of the painted sky and half the controls flashing up first.
  const [sceneFailed, setSceneFailed] = useState(false);
  const [weatherIn, setWeatherIn] = useState(false);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (shown) return;
    const reveal = () => {
      setShown(true);
      const boot = document.getElementById('boot');
      if (boot) {
        boot.classList.add('gone');
        setTimeout(() => boot.remove(), 900);
      }
    };
    if ((sceneReady || sceneFailed) && weatherIn) return reveal();
    // Never hold the page for long: a slow network or a slow device gets the page anyway.
    const t = setTimeout(reveal, sceneReady || sceneFailed ? 1200 : 4000);
    return () => clearTimeout(t);
  }, [shown, sceneReady, sceneFailed, weatherIn]);
  const endIntro = () => { setIntro(false); markIntroSeen(); };
  const [vibe, setVibe] = useState('');
  const [vibeOpen, setVibeOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [active, setActive] = useState<number | null>(null); // the card the model is looking at
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [, setWeatherTick] = useState(0);
  const [shared, setShared] = useState<string | null>(() => /^#\/p\/(.+)$/.exec(location.hash)?.[1] ?? null);

  const weather = useRef<Weather | null>(null);
  const events = useRef<Option[]>([]);
  const nearby = useRef<Option[]>([]);
  const loaded = useRef<Promise<unknown>>(Promise.resolve());
  const logRef = useRef(log);
  const deck = useRef<HTMLOListElement>(null);
  const debug = useMemo(() => new URLSearchParams(location.search).has('debug'), []);
  const preview = useMemo(() => new URLSearchParams(location.search).get('weather'), []);

  const record = (id: string, verb: Verb) => {
    const next = append(logRef.current, id, verb, Date.now());
    logRef.current = next;
    saveLog(next);
    setLog(next);
  };

  const say = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 4500);
  };

  // Look outside and at the calendar while the person is choosing.
  useEffect(() => {
    const w = fetchWeather(city.center, Date.now()).then((x) => { weather.current = x; setWeatherTick((n) => n + 1); setWeatherIn(true); });
    const e = fetch('./events.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => { events.current = loadEvents(json, Date.now()); setWeatherTick((n) => n + 1); })
      .catch(() => undefined);
    const n = fetch('./nearby.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => void (nearby.current = loadNearby(json)))
      .catch(() => undefined);
    loaded.current = Promise.all([w, e, n]);
  }, []);

  const world = (options: Option[], now: number) => ({ city, options, weather: weather.current, memory: summarize(logRef.current, options, now), fallback: nearby.current });

  /** Ask the matcher. Everything the person chose is passed in, so nothing here reads stale state. */
  const ask = (q: { mood: string; text: string; duration: number; shuffles: number }) => {
    const now = Date.now();
    const along = COMPANY.find((c) => c[0] === company);
    const intent = parseIntent(q.text || `${q.mood} ${along?.[1] ?? ''}`);
    if (vibe) intent.vibe = vibe;
    const picked = startKey === 'pick' ? custom : null;
    // Words win over the controls: "tomorrow morning" typed beats "now" selected.
    const start = Math.max(now, picked ?? resolveStart(intent.start ?? parseIntent(startKey).start, now, tz));
    const options = [...places, ...events.current.filter((e) => e.when!.end > now)];
    const durationMin = intent.durationMin ?? q.duration;
    const req: Request = { now, start, durationMin, origin: origin ?? city.center, mode, intent, seed: Math.floor(now / DAY) * 31 + q.shuffles };
    const w = world(options, now);
    const result = match(req, w);
    // "Local today" asked about tomorrow is still what's on, just not today.
    const tile = intent.today && q.mood && fmtDay(start, now, tz) !== 'today' ? "What's on" : MOODS.find((m) => m[2] === q.mood)?.[0];
    const hours = durationMin % 60 === 0 ? `${durationMin / 60} hour${durationMin === 60 ? '' : 's'}` : `${durationMin} minutes`;
    setActive(null);
    setView({ req, result, options, label: [q.text ? `“${q.text}”` : [tile ?? 'Anything', along && along[1] ? along[0].toLowerCase() : null, vibe ? vibeLabel(vibe) : null].filter(Boolean).join(', '), hours].join(' · ') });
    setExcluded([]);
    for (const p of result.picks) {
      const last = w.memory.lastShown.get(p.option.id);
      if (!last || now - last > 10 * MIN) record(p.option.id, 'shown');
    }
  };

  /** The beat between asking and the reveal: real work, kept short. */
  const reveal = async (q: { mood: string; text: string; duration: number; shuffles: number }) => {
    setStage('thinking');
    setLine(0);
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ticker = setInterval(() => setLine((n) => (n + 1) % THINKING.length), 600);
    const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
    await Promise.all([pause(calm ? 200 : 1700), Promise.race([loaded.current, pause(2500)])]);
    clearInterval(ticker);
    ask(q);
    setStage('results');
    window.scrollTo(0, 0);
  };

  const chooseMood = (words: string) => {
    setMood(words);
    setText('');
    setStage('time');
  };

  const submitText = (e: Event) => {
    e.preventDefault();
    const typed = String(new FormData(e.currentTarget as HTMLFormElement).get('say') ?? '').trim();
    if (!typed) return;
    setMood('');
    setText(typed);
    // If they already said how long, don't ask again.
    if (parseIntent(typed).durationMin) reveal({ mood: '', text: typed, duration, shuffles });
    else setStage('time');
  };

  const chooseDuration = (minutes: number) => {
    setDuration(minutes);
    reveal({ mood, text, duration: minutes, shuffles });
  };

  const again = () => {
    setShuffles(shuffles + 1);
    reveal({ mood, text, duration, shuffles: shuffles + 1 });
  };

  const swap = (id: string) => {
    if (!view) return;
    const exclude = [...excluded, id];
    const keep = view.result.picks.map((p) => p.option.id).filter((x) => x !== id);
    const req = { ...view.req, keep, exclude };
    const next = match(req, world(view.options, view.req.now));
    const replacement = next.picks.find((p) => !keep.includes(p.option.id));
    // The newcomer takes the seat of the one that left; the others don't move.
    const picks = view.result.picks
      .map((p) => (p.option.id === id ? replacement : next.picks.find((n) => n.option.id === p.option.id)))
      .filter((p): p is Pick => Boolean(p));
    setExcluded(exclude);
    setView({ ...view, req, result: { ...next, picks } });
    record(id, 'skip');
    if (replacement) record(replacement.option.id, 'shown');
    else say("That was the last good one. I won't pad the list.");
  };

  const onBalloon = () => {
    if (stage !== 'mood' && stage !== 'time') return;
    say('Up we go. A surprise it is.');
    chooseMood('surprise me');
  };

  /** A beacon was tapped: bring its card forward. */
  const onPin = (i: number) => {
    setActive(i);
    const li = deck.current?.children[i] as HTMLElement | undefined;
    li?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  /** The deck was swiped: point the model at the card now in front. */
  const onDeckScroll = () => {
    const el = deck.current;
    if (!el || el.scrollWidth <= el.clientWidth + 4) return;
    const mid = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    [...el.children].forEach((c, i) => {
      const li = c as HTMLElement;
      if (Math.abs(li.offsetLeft + li.offsetWidth / 2 - mid) < Math.abs((el.children[best] as HTMLElement).offsetLeft + (el.children[best] as HTMLElement).offsetWidth / 2 - mid)) best = i;
    });
    if (el.scrollLeft > 8 || active !== null) setActive(best);
  };

  const memory = useMemo(() => summarize(log, view?.options ?? places, Date.now()), [log, view]);
  const byId = (id: string) => (view?.options ?? places).find((o) => o.id === id) ?? nearby.current.find((o) => o.id === id);

  const toggleSave = (id: string) => {
    if (memory.saved.includes(id)) return record(id, 'unsave');
    if (memory.saved.length >= MAX_SAVED) return say(`Your list holds ${MAX_SAVED}. That's on purpose. Let one go first.`);
    record(id, 'save');
  };

  const share = async (o: Option) => {
    const url = `${location.origin}${location.pathname}#/p/${encodeURIComponent(o.id)}`;
    try {
      if (navigator.share) await navigator.share({ title: o.name, text: `${o.name}: ${o.what}.`, url });
      else {
        await navigator.clipboard.writeText(url);
        say('Link copied. Send it to someone.');
      }
    } catch {
      /* they changed their mind */
    }
  };

  /** Pick where travel is measured from. Only "where I am" needs the device; if that fails, say exactly why. */
  const chooseStart = (name: string) => {
    setLocHelp('');
    if (name !== 'me') {
      setStartFrom(name);
      saveStart(name);
      return;
    }
    const fallBack = (why: string) => {
      setFinding(false);
      setLocHelp(why);
    };
    if (!navigator.geolocation) return fallBack("This browser can't share a location.");
    setFinding(true);
    const found = (pos: GeolocationPosition) => {
      setFinding(false);
      const at = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const away = miles(at, city.center);
      if (away > 30) return say(`You're about ${Math.round(away)} miles from ${city.name}, so I'll keep measuring from ${startFrom || city.centerName}.`);
      setHere(at);
      setStartFrom('me');
      say('Got it. Measuring from where you are.');
    };
    const failed = (err: GeolocationPositionError) => {
      // A precise fix can time out indoors; a rough one is plenty for travel estimates.
      if (err.code !== err.PERMISSION_DENIED && !retried) {
        retried = true;
        return navigator.geolocation.getCurrentPosition(found, failed, { enableHighAccuracy: false, maximumAge: 30 * 60_000, timeout: 20_000 });
      }
      fallBack(err.code === err.PERMISSION_DENIED ? BLOCKED : "Your device couldn't work out where it is just now.");
    };
    let retried = false;
    navigator.geolocation.getCurrentPosition(found, failed, { enableHighAccuracy: false, maximumAge: 5 * 60_000, timeout: 10_000 });
  };

  // The backdrop is the sky over the city at the moment in question.
  const results = stage === 'results' && view;
  const skyTime = results ? view.req.start : Date.now();
  const sun = sunFor(skyTime, city.center.lat, city.center.lng, tz);
  const sky = skyAt(skyTime, sun);
  // The header describes the sky at that moment, not the worst of the whole window.
  const conditions = conditionsFor(weather.current, skyTime, skyTime + HOUR);
  const part = partOfDay(toLocal(skyTime, tz).h);
  const local = toLocal(skyTime, tz);
  const skyInput: SkyInput = {
    time: skyTime, sunrise: sun.sunrise, sunset: sun.sunset,
    wet: !conditions.known ? 0 : { dry: 0, damp: 0.45, wet: 0.85, storm: 1 }[conditions.sky],
    fog: conditions.known && conditions.foggy ? 1 : 0,
    snowing: /snow|flurr/.test(conditions.summary), storm: conditions.known && conditions.sky === 'storm', snowIn: conditions.known ? conditions.snowIn : 0,
    // The lakes hold ice from about the turn of the year into March; a November snow falls on open water.
    frozen: conditions.known && conditions.tempF < 33 && (local.mo === 12 || local.mo <= 3), month: local.mo,
    ...PREVIEW[preview ?? ''],
  };
  const pins: Pin[] = results
    ? view.result.picks.map((p) => ({
        ...offsetMiles(city.center, p.option),
        color: PIN_COLOR[GROUP[p.option.category]]!,
        minutes: p.travelMin,
      }))
    : [];
  const home = results ? offsetMiles(city.center, view.req.origin) : null;
  // What's on in the next few hours, one light per venue, for the opening scene.
  const live: Live[] = [];
  if (!results && beams && !intro) {
    const soon = events.current.filter((e) => e.when!.end > skyTime && e.when!.start < skyTime + 6 * HOUR).sort((a, b) => a.when!.start - b.when!.start);
    const taken = new Set<string>();
    for (const e of soon) {
      const key = `${e.lat.toFixed(3)},${e.lng.toFixed(3)}`;
      if (taken.has(key) || live.length >= 9) continue;
      taken.add(key);
      const label = `${fmtTime(e.when!.start, tz)} · ${e.name}`;
      live.push({ ...offsetMiles(city.center, e), color: PIN_COLOR[GROUP[e.category]]!, label: label.length > 34 ? `${label.slice(0, 33)}…` : label });
    }
  }
  const now = Date.now();
  const checkIn = pendingCheckIn(log, now);
  const checkInPlace = checkIn ? byId(checkIn) ?? places.find((p) => p.id === checkIn) : undefined;
  const r = view?.result;
  const moment = [
    results && view.req.start - view.req.now > 5 * MIN ? `${cap(fmtDay(view.req.start, view.req.now, tz))}, ${fmtTime(view.req.start, tz)}` : fmtTime(now, tz),
    conditions.known ? conditions.summary : null,
    skyTime < sun.sunset && skyTime > sun.sunrise ? `sunset ${fmtTime(sun.sunset, tz)}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div class={`page stage-${stage}${intro ? ' intro-on' : ''}${shown ? ' shown' : ''}`}>
      <header class={`sky ${sky.phase}${conditions.known && conditions.sky !== 'dry' ? ' grey' : ''}${results ? ' small' : ''}`}>
        <Scene onReady={() => setSceneReady(true)} onFail={() => setSceneFailed(true)} pose={intro ? (shown && sceneReady ? 'intro' : 'mood') : stage} sky={skyInput} pins={pins} home={home} live={live} active={active} onPin={onPin} onBalloon={onBalloon} />
        <div class="orb" aria-hidden="true" style={{ left: `${10 + 80 * sky.progress}%`, top: `${62 - Math.sin(Math.PI * sky.progress) * 44}%` }} />
        <div class="sky-inner">
          <p class="brand">
            <button class="plain" onClick={() => setStage('mood')} aria-label={`Do Something, ${city.name}: start over`}>Do Something · {city.name}</button>
            <span>{moment}</span>
          </p>
          {stage === 'mood' && !intro && <button type="button" class="help" onClick={() => setIntro(true)} aria-label="How this works">?</button>}
          {stage === 'mood' && <h1>You have a free {part}.<em>Make the most of it.</em></h1>}
          {stage === 'time' && <h1>How long have you got?</h1>}
          {stage === 'thinking' && <h1 class="pulse" aria-live="polite">{THINKING[line]}</h1>}
          {results && r && (
            <h1>
              {r.picks.length === 0 ? (/^Nothing close/.test(r.note ?? '') ? 'Nothing close enough.' : /Nothing on /.test(r.note ?? '') ? 'Nothing on just then.' : 'Nothing honest to offer.') : `${COUNT[r.picks.length]} for your ${partOfDay(toLocal(view.req.start, tz).h)}.`}
              <em>{view.label}</em>
            </h1>
          )}
        </div>
        <svg class="shore" viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 34 C 150 6, 300 58, 450 32 S 750 8, 900 34 S 1100 54, 1200 26 V60 H0 Z" />
        </svg>
        {intro && <Intro ready={shown} onDone={endIntro} />}
      </header>

      {stage === 'mood' && (
        <main class="step" key="mood">
          {checkInPlace && (
            <section class="checkin" aria-label="Check-in">
              <p>Before anything else: did you make it to <strong>{checkInPlace.name}</strong>?</p>
              <div class="row">
                <button onClick={() => record(checkInPlace.id, 'liked')}>Went. Glad I did</button>
                <button onClick={() => record(checkInPlace.id, 'meh')}>Went. Not for me</button>
                <button onClick={() => record(checkInPlace.id, 'nope')}>Didn't go</button>
              </div>
            </section>
          )}
          {shared && <Shared id={shared} options={[...places, ...events.current, ...nearby.current]} weather={weather.current} mode={mode} onClose={() => { history.replaceState(null, '', location.pathname + location.search); setShared(null); }} />}
          <h2 class="q">Who's coming? <span>optional</span></h2>
          <div class="pills" role="group" aria-label="Who's coming">
            {COMPANY.map(([label]) => (
              <button class="pill" aria-pressed={company === label} onClick={() => setCompany(company === label ? null : label)}>{label}</button>
            ))}
          </div>
          <h2 class="q">What sounds good?</h2>
          <div class="tiles">
            {MOODS.map(([label, sub, words], i) => (
              <button class="tile" style={{ '--i': i }} onClick={() => chooseMood(words)}>
                <strong>{label}</strong>
                <span>{sub}</span>
              </button>
            ))}
            <button class="tile accent" style={{ '--i': MOODS.length }} onClick={() => chooseMood('surprise me')}>
              <strong>Surprise me</strong>
              <span>whatever's best right now</span>
            </button>
          </div>
          <form class="say" onSubmit={submitText}>
            <label class="sr" for="say">Or say it your own way</label>
            <input id="say" name="say" type="text" placeholder="or say it: “rainy afternoon, two hours, cheap”" autocomplete="off" enterkeyhint="go" />
            <button type="submit" class="go" aria-label="Go">→</button>
          </form>
        </main>
      )}

      {stage === 'time' && (
        <main class="step" key="time">
          <h2 class="q">The details <span>change any of them</span></h2>
          <p class="sentence">
            Starting{' '}
            <select aria-label="Starting when" value={startKey} onChange={(e) => { setStartKey(e.currentTarget.value); if (e.currentTarget.value === 'pick' && !custom) setCustom(Date.now() + 2 * HOUR); }}>
              {STARTS.map(([v, l]) => <option value={v}>{l}</option>)}
            </select>
            , getting there{' '}
            <select aria-label="How you're getting around" value={mode} onChange={(e) => { const m = e.currentTarget.value as Mode; setMode(m); saveMode(m); }}>
              {MODES.map(([v, l]) => <option value={v}>{l}</option>)}
            </select>
            , from{' '}
            <select aria-label="Where you're starting from" value={finding ? 'finding' : startFrom} disabled={finding} onChange={(e) => { const v = e.currentTarget.value; if (v === 'me') e.currentTarget.value = startFrom; chooseStart(v); }}>
              {finding && <option value="finding">finding you…</option>}
              <option value="">{city.centerName}</option>
              <option value="me">where I am now</option>
              {city.starts.map((s) => <option value={s.name}>{s.name}</option>)}
            </select>.<br />And the vibe is{' '}
            <button type="button" class="link vibe-link" aria-haspopup="dialog" onClick={() => setVibeOpen(true)}><VibeIcon id={vibe} />{vibeLabel(vibe)}</button>.
          </p>
          {locHelp && (
            <p class="note" role="status" style={{ margin: "0 0 1.1rem", fontSize: "0.95rem" }}>
              {locHelp} Or skip it: pick the nearest area from the “from” list above. It only changes the travel times.
            </p>
          )}
          {startKey === 'pick' && (
            <label class="pick">
              <span>When ({city.name} time)</span>
              <input type="datetime-local" value={toLocalInput(custom ?? Date.now(), tz)} min={toLocalInput(Date.now(), tz)}
                onChange={(e) => { const t = parseLocalInput(e.currentTarget.value, tz); if (t) setCustom(t); }} />
            </label>
          )}
          {/* Last on purpose: tapping a time is the "go", so everything adjustable sits above it. */}
          <h2 class="q">How long? <span>tap one to go</span></h2>
          <div class="tiles">
            {DURATIONS.map(([minutes, label, sub], i) => (
              <button class="tile" style={{ '--i': i + 3 }} onClick={() => chooseDuration(minutes)}>
                <strong>{label}</strong>
                <span>{sub}</span>
              </button>
            ))}
          </div>
          <p class="back"><button class="link" onClick={() => setStage('mood')}>← Back</button></p>
        </main>
      )}

      {stage === 'thinking' && <main class="step waiting" key="thinking" aria-hidden="true"><span /><span /><span /></main>}

      {results && r && (
        <main class="step" key="results" aria-live="polite">
          {r.note && <p class="note">{r.note}</p>}
          {!r.conditions.known && r.picks.some((p) => p.option.setting === 'out') && (
            <p class="note quiet">I couldn't get the weather just now, so take the outdoor ideas with a look out the window.</p>
          )}
          <ol class={`deck n${r.picks.length}`} ref={deck} onScroll={onDeckScroll}>
            {r.picks.map((p, i) => (
              <li key={p.option.id} style={{ '--i': i }} class={active === i ? 'lit' : ''} onPointerEnter={(e) => { if (e.pointerType === 'mouse') setActive(i); }}>
                <Card pick={p} index={i} total={r.picks.length} now={view.req.now} mode={view.req.mode} origin={origin}
                  saved={memory.saved.includes(p.option.id)} venueNudge={p.option.placeId ? byId(p.option.placeId)?.nudge : undefined}
                  onSave={() => toggleSave(p.option.id)} onShare={() => share(p.option)} onSkip={() => swap(p.option.id)} onGo={() => record(p.option.id, 'go')} />
              </li>
            ))}
          </ol>
          {r.picks.length > 1 && <p class="hint">Swipe for the others</p>}
          <p class="after">
            {r.picks.length > 0 && <button class="ghost" onClick={again}>Deal three more</button>}
            <button class="ghost" onClick={() => setStage('mood')}>Start over</button>
          </p>
          {debug && <Debug result={r} />}
        </main>
      )}

      <footer>
        <div class="row">
          <button class="link" onClick={() => setSheet(true)}>Saved ({memory.saved.length}/{MAX_SAVED}) · Been ({memory.went.size})</button>
          <button class="link" onClick={() => { const next: Theme = theme === 'auto' ? 'dark' : theme === 'dark' ? 'light' : 'auto'; setTheme(next); saveTheme(next); }}>Theme: {theme}</button>
        </div>
        <label class="switch">
          <input type="checkbox" role="switch" checked={beams} onChange={(e) => { setBeams(e.currentTarget.checked); saveBeams(e.currentTarget.checked); }} />
          <span class="track" aria-hidden="true" />
          Show key events in Madison
        </label>
        <p>Map shapes and “from the map” places © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors.</p>
        {results && <p>“Usually open” means the hours haven't been checked by hand yet, so confirm before a long trip. Travel times are estimates. Your history stays on this device.</p>}
      </footer>

      {sheet && (
        <Sheet onClose={() => setSheet(false)}>
          <h2>Saved for later</h2>
          {memory.saved.length === 0 && <p class="muted">Nothing yet. Five spots, no more. A list longer than that is a list you won't use.</p>}
          <ul class="list">
            {memory.saved.map((id) => {
              const o = byId(id);
              return o ? (
                <li>
                  <div><strong>{o.name}</strong><span>{o.what}</span></div>
                  <a class="link" href={directionsUrl(o.name, city.label, mode, origin ?? undefined)} target="_blank" rel="noopener" onClick={() => record(id, 'go')}>Directions</a>
                  <button class="link" onClick={() => record(id, 'unsave')}>Remove</button>
                </li>
              ) : null;
            })}
          </ul>
          <h2>Where you've been</h2>
          {memory.went.size === 0 && <p class="muted">When you tap Directions, I'll ask later whether you went. Those places collect here.</p>}
          <ul class="list">
            {[...memory.went.entries()].map(([id, w]) => {
              const o = byId(id);
              return o ? <li><div><strong>{o.name}</strong><span>{o.hood} · {w.liked ? 'glad you went' : 'not for you'}</span></div></li> : null;
            })}
          </ul>
          <p><button class="link danger" onClick={() => { if (confirm('Forget everything this device remembers about where you went, saved and skipped?')) { forgetEverything(); logRef.current = []; setLog([]); } }}>Forget everything</button></p>
        </Sheet>
      )}

      {vibeOpen && <VibeSheet value={vibe} onPick={(id) => { setVibe(id); setVibeOpen(false); }} onClose={() => setVibeOpen(false)} />}
      {toast && <div class="toast" role="status">{toast}</div>}
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The 3D model behind the header. Loaded on demand; if it can't start (no
 * WebGL, an old phone), nothing is rendered and the painted sky stays.
 */
function Scene(props: { onReady?: () => void; onFail?: () => void; pose: Pose; sky: SkyInput; pins: Pin[]; home: { east: number; north: number } | null; live: Live[]; active: number | null; onPin: (i: number) => void; onBalloon: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const model = useRef<Diorama | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const [on, setOn] = useState(false);
  const [hint, setHint] = useState(true);
  // Shown only once it has actually drawn, so nothing half-built ever flashes up.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let gone = false;
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    import('./scene')
      .then((m) => {
        if (gone || !canvas.current) return;
        model.current = m.createDiorama(canvas.current, shape, {
          onPin: (i) => latest.current.onPin(i),
          onBalloon: () => latest.current.onBalloon(),
          onTouch: () => setHint(false),
          onReady: () => { setReady(true); latest.current.onReady?.(); },
        }, calm);
        setOn(true);
      })
      .catch(() => latest.current.onFail?.()); // no WebGL: the painted sky is the fallback
    const t = setTimeout(() => setHint(false), 12_000);
    return () => {
      gone = true;
      clearTimeout(t);
      model.current?.dispose();
      model.current = null;
    };
  }, []);

  const s = props.sky;
  useEffect(() => model.current?.setSky(s), [on, Math.round(s.time / 60_000), s.wet, s.fog, s.snowing, s.storm, s.frozen, Math.round(s.snowIn), s.month]);
  useEffect(() => model.current?.setPose(props.pose), [on, props.pose]);
  useEffect(() => model.current?.setPins(props.pins), [on, props.pins.map((p) => `${p.east.toFixed(3)},${p.north.toFixed(3)}`).join('|')]);
  useEffect(() => model.current?.setHome(props.home), [on, props.home ? `${props.home.east.toFixed(3)},${props.home.north.toFixed(3)}` : '']);
  useEffect(() => model.current?.setLive(props.live), [on, props.live.map((l) => l.label).join('|')]);
  useEffect(() => model.current?.focus(props.active), [on, props.active]);

  return (
    <div class={`scene${ready ? ' on' : ''}`}>
      <canvas ref={canvas} aria-label="A small model of Madison under the current sky. Decorative; everything it does is also available below." />
      {ready && (
        <div class="scene-zoom">
          <button type="button" aria-label="Zoom in" onClick={() => model.current?.zoom(0.7)}>+</button>
          <button type="button" aria-label="Zoom out" onClick={() => model.current?.zoom(1 / 0.7)}>−</button>
        </div>
      )}
      {ready && hint && <span class="scene-hint">{props.live.length ? 'Drag to look. Tap a beam to see what’s on tonight.' : 'Drag to look around. Tap things.'}</span>}
    </div>
  );
}

function Card(props: {
  pick: Pick; index: number; total: number; now: number; mode: Mode; origin: LatLng | null; saved: boolean; venueNudge?: string;
  onSave: () => void; onShare: () => void; onSkip: () => void; onGo: () => void;
}) {
  const { pick } = props;
  const o = pick.option;
  const turn = pick.reason.startsWith('The left turn. ');
  return (
    <article class={`card g-${GROUP[o.category]}`}>
      <div class="plate">
        <span class="num" aria-hidden="true">{props.index + 1}</span>
        <span class="kicker">{o.kind === 'event' ? 'Happening' : cap(o.category)} · {o.hood}</span>
        <span class="tags">
          {turn && <b>The left turn</b>}
          {o.source === 'osm' && <b>From the map</b>}
          {o.price === 0 && <b>Free</b>}
        </span>
        <svg viewBox="0 0 400 40" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 22 C 50 8, 100 34, 150 20 S 250 6, 300 22 S 370 32, 400 16" />
          <path d="M0 32 C 60 20, 110 42, 170 30 S 260 18, 320 32 S 380 38, 400 28" />
        </svg>
      </div>
      <div class="body">
        <h3>{o.name}</h3>
        <p class="what">{o.what}</p>
        <p class="reason">{turn ? pick.reason.slice(15) : pick.reason}</p>
        {pick.caveat && <p class="caveat">{pick.caveat}</p>}
        <p class="facts">
          <span class="open">{statusLine(pick, props.now, tz)}</span>
          <span>{cap(travelLabel(pick.travelMin, props.mode))}</span>
        </p>
        <p class="story">{o.story}</p>
        {o.nudge && <p class="nudge"><span>Do this</span>{o.nudge}</p>}
        {!o.nudge && props.venueNudge && <p class="nudge"><span>While you're there</span>{props.venueNudge}</p>}
        {o.url && <p class="source"><a href={o.url} target="_blank" rel="noopener">{o.source === 'osm' ? 'Their website' : o.source ? `Details and tickets (${SOURCES[o.source] ?? 'source'})` : 'Their website'}</a></p>}
      </div>
      <div class="actions">
        <a class="primary" href={directionsUrl(o.venue ?? o.name, city.label, props.mode, props.origin ?? undefined)} target="_blank" rel="noopener" onClick={props.onGo}>Take me there</a>
        <div>
          <button onClick={props.onSave} aria-pressed={props.saved}>{props.saved ? 'Saved' : 'Save'}</button>
          <button onClick={props.onShare}>Share</button>
          <button onClick={props.onSkip} aria-label={`Not ${o.name}. Show me something else`}>Not this</button>
        </div>
      </div>
    </article>
  );
}

/** A suggestion a friend sent. Judged by the same matcher, for right now. */
function Shared(props: { id: string; options: Option[]; weather: Weather | null; mode: Mode; onClose: () => void }) {
  const o = props.options.find((x) => x.id === decodeURIComponent(props.id));
  const now = Date.now();
  if (!o) {
    return <section class="shared"><p>Someone sent you a suggestion, but it's over or no longer on the list.</p><button class="link" onClick={props.onClose}>OK</button></section>;
  }
  const req: Request = { now, start: now, durationMin: 180, origin: city.center, mode: 'drive', intent: parseIntent(''), seed: 0 };
  const result = match(req, { city, options: [o], weather: props.weather, memory: summarize([], [o], now) });
  const pick = result.picks[0];
  return (
    <section class="shared" aria-label="Sent to you">
      <span class="kicker">A friend thought you'd like this</span>
      <h2>{o.name}</h2>
      <p class="what">{o.what} · {o.hood}</p>
      <p class="status"><span>{pick ? statusLine(pick, now, tz) : `Not right now: ${result.debug.rejected[0]?.why ?? 'closed'}`}</span></p>
      <p>{o.story}</p>
      {o.nudge && <p class="nudge"><span>Do this</span>{o.nudge}</p>}
      <div class="actions">
        <a class="primary" href={directionsUrl(o.venue ?? o.name, city.label, props.mode)} target="_blank" rel="noopener">Directions</a>
        <button onClick={props.onClose}>Close</button>
      </div>
    </section>
  );
}

function Sheet(props: { onClose: () => void; children: ComponentChildren }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} class="sheet" onClose={props.onClose} onClick={(e) => { if (e.target === ref.current) props.onClose(); }}>
      <div class="sheet-body">
        {props.children}
        <button class="go" onClick={props.onClose}>Done</button>
      </div>
    </dialog>
  );
}

/** ?debug — why each pick was chosen, and why everything else wasn't. */
function Debug({ result }: { result: Result }) {
  const gates = new Map<string, string[]>();
  for (const x of result.debug.rejected) gates.set(x.gate, [...(gates.get(x.gate) ?? []), x.id]);
  const chosen = new Set(result.picks.map((p) => p.option.id));
  return (
    <details class="debug" open>
      <summary>Why these ({result.debug.ranked.length} doable, {result.debug.rejected.length} ruled out)</summary>
      <table>
        <tbody>
          {result.debug.ranked.slice(0, 15).map((p) => (
            <tr class={chosen.has(p.option.id) ? 'chosen' : ''}>
              <td>{p.option.id}</td>
              <td>{p.score.toFixed(2)}</td>
              <td>{Object.entries(p.parts).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v.toFixed(2)}`).join('  ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {[...gates.entries()].map(([gate, ids]) => <p><strong>{gate}</strong> ({ids.length}): {ids.join(', ')}</p>)}
    </details>
  );
}
