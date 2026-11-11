import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { city, places } from '../cities/madison';
import { loadEvents } from '../core/events';
import { directionsUrl, miles, travelLabel, type LatLng, type Mode } from '../core/geo';
import { append, MAX_SAVED, pendingCheckIn, summarize, type Entry, type Verb } from '../core/history';
import { parseIntent, resolveStart } from '../core/intent';
import { match, statusLine, type Pick, type Request, type Result } from '../core/match';
import type { ComponentChildren } from 'preact';
import { DAY, HOUR, MIN, fmtDay, fmtTime, parseLocalInput, toLocalInput } from '../core/time';
import type { Option } from '../core/types';
import { fetchWeather, type Weather } from '../core/weather';
import { forgetEverything, loadLog, loadMode, loadTheme, saveLog, saveMode, saveTheme, type Theme } from './store';

const tz = city.tz;

// Chips are just canned words: they go through the same parser as typing does.
const CHIPS: [label: string, say: string][] = [
  ['Need to think', 'think'], ['Date', 'date'], ['Kids along', 'kids'], ['Friend visiting', 'visiting'],
  ['Hungry', 'hungry'], ['A drink', 'drink'], ['Move', 'move'], ['Somewhere cozy', 'cozy'],
  ['Something odd', 'odd'], ['Cheap', 'cheap'], ['Surprise me', 'surprise me'],
];
const DURATIONS: [number, string][] = [[60, 'an hour'], [120, 'two hours'], [180, 'three hours'], [300, 'half the day']];
const STARTS: [string, string][] = [['now', 'now'], ['tonight', 'tonight'], ['tomorrow morning', 'tomorrow morning'], ['saturday morning', 'Saturday morning'], ['pick', 'at a time I pick…']];
const MODES: [Mode, string][] = [['walk', 'on foot'], ['bike', 'by bike'], ['drive', 'by car']];

interface View {
  req: Request;
  result: Result;
  options: Option[];
}

export function App() {
  const [chips, setChips] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [draft, setDraft] = useState('');
  const [duration, setDuration] = useState(120);
  const [startKey, setStartKey] = useState('now');
  const [custom, setCustom] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>(loadMode);
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [log, setLog] = useState<Entry[]>(loadLog);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [shuffles, setShuffles] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState('');
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [shared, setShared] = useState<string | null>(() => /^#\/p\/(.+)$/.exec(location.hash)?.[1] ?? null);

  const weather = useRef<Weather | null>(null);
  const events = useRef<Option[]>([]);
  const logRef = useRef(log);
  const debug = useMemo(() => new URLSearchParams(location.search).has('debug'), []);

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

  // Look outside and at the calendar first, briefly. If either is slow or
  // down we go ahead without it rather than keep anyone waiting.
  useEffect(() => {
    const w = fetchWeather(city.center, Date.now()).then((x) => void (weather.current = x));
    const e = fetch('./events.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => void (events.current = loadEvents(json, Date.now())))
      .catch(() => undefined);
    const patience = new Promise((r) => setTimeout(r, 1800));
    Promise.race([Promise.all([w, e]), patience]).then(() => setReady(true));
  }, []);

  const world = (options: Option[], now: number) => ({ city, options, weather: weather.current, memory: summarize(logRef.current, options, now) });

  const fresh = () => {
    const now = Date.now();
    const intent = parseIntent([...chips, text].join(' '));
    const picked = startKey === 'pick' ? custom : null;
    // Words win over the controls: "tomorrow morning" typed beats "now" selected.
    const start = Math.max(now, picked ?? resolveStart(intent.start ?? parseIntent(startKey).start, now, tz));
    const options = [...places, ...events.current.filter((e) => e.when!.end > now)];
    const req: Request = {
      now, start, durationMin: intent.durationMin ?? duration, origin: origin ?? city.center, mode, intent,
      seed: Math.floor(now / DAY) * 31 + shuffles,
    };
    const w = world(options, now);
    const result = match(req, w);
    setView({ req, result, options });
    setExcluded([]);
    setOpen(result.picks[0]?.option.id ?? null);
    for (const p of result.picks) {
      const last = w.memory.lastShown.get(p.option.id);
      if (!last || now - last > 10 * MIN) record(p.option.id, 'shown');
    }
  };

  useEffect(() => {
    if (ready) fresh();
  }, [ready, chips, text, duration, startKey, custom, mode, origin, shuffles]);

  // Coming back to the tab after a while: the moment has changed, so ask again.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && view && Date.now() - view.req.now > 10 * MIN) fresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  });

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
    if (replacement) {
      record(replacement.option.id, 'shown');
      setOpen(replacement.option.id);
    }
  };

  const memory = useMemo(() => summarize(log, view?.options ?? places, Date.now()), [log, view]);
  const byId = (id: string) => (view?.options ?? places).find((o) => o.id === id);

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

  const locate = () => {
    if (origin) return setOrigin(null);
    if (!navigator.geolocation) return say("This browser won't share a location, so I'm measuring from " + city.centerName + '.');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (miles(here, city.center) > 30) say(`You're not in ${city.name} right now, so I'm measuring from ${city.centerName}.`);
        else setOrigin(here);
      },
      () => say(`No location, no problem. Measuring from ${city.centerName}.`),
      { maximumAge: 5 * 60_000, timeout: 8000 },
    );
  };

  const submit = (e: Event) => {
    e.preventDefault();
    setText(draft.trim());
    (document.activeElement as HTMLElement | null)?.blur();
  };

  const checkIn = pendingCheckIn(log, Date.now());
  const checkInPlace = checkIn ? byId(checkIn) ?? places.find((p) => p.id === checkIn) : undefined;
  const r = view?.result;
  const now = view?.req.now ?? Date.now();
  const later = view ? view.req.start - view.req.now > 5 * MIN : false;
  const heard = view?.req.intent.heard ?? [];

  return (
    <div class="page">
      <header class="top">
        <h1>
          Go Do Something <span>{city.name}</span>
        </h1>
        <p class="moment" aria-live="polite">
          {view && r
            ? [
                later ? `${cap(fmtDay(view.req.start, now, tz))} at ${fmtTime(view.req.start, tz)}` : `It's ${fmtTime(now, tz)}`,
                r.conditions.known ? r.conditions.summary : null,
                view.req.start < r.sun.sunset ? `sunset at ${fmtTime(r.sun.sunset, tz)}` : view.req.start < r.sun.sunset + HOUR ? 'just after sunset' : null,
              ].filter(Boolean).join(' · ')
            : 'Looking outside…'}
        </p>
      </header>

      {checkInPlace && (
        <section class="checkin" aria-label="Check-in">
          <p>
            Did you make it to <strong>{checkInPlace.name}</strong>?
          </p>
          <div class="row">
            <button onClick={() => record(checkInPlace.id, 'liked')}>Went. Glad I did</button>
            <button onClick={() => record(checkInPlace.id, 'meh')}>Went. Not for me</button>
            <button onClick={() => record(checkInPlace.id, 'nope')}>Didn't go</button>
          </div>
        </section>
      )}

      {shared && ready && <Shared id={shared} options={[...places, ...events.current]} weather={weather.current} mode={mode} onClose={() => { history.replaceState(null, '', location.pathname + location.search); setShared(null); }} />}

      <form class="ask" onSubmit={submit}>
        <p class="sentence">
          I have{' '}
          <select aria-label="How much time" value={duration} onChange={(e) => setDuration(Number(e.currentTarget.value))}>
            {DURATIONS.map(([v, l]) => <option value={v}>{l}</option>)}
          </select>
          , starting{' '}
          <select aria-label="Starting when" value={startKey} onChange={(e) => { setStartKey(e.currentTarget.value); if (e.currentTarget.value === 'pick' && !custom) setCustom(Date.now() + 2 * HOUR); }}>
            {STARTS.map(([v, l]) => <option value={v}>{l}</option>)}
          </select>
          , getting there{' '}
          <select aria-label="How you're getting around" value={mode} onChange={(e) => { const m = e.currentTarget.value as Mode; setMode(m); saveMode(m); }}>
            {MODES.map(([v, l]) => <option value={v}>{l}</option>)}
          </select>{' '}
          from{' '}
          <button type="button" class="link" onClick={locate} aria-pressed={Boolean(origin)}>
            {origin ? 'where I am' : city.centerName}
          </button>
          .
        </p>
        {startKey === 'pick' && (
          <label class="pick">
            <span>When ({city.name} time)</span>
            <input type="datetime-local" value={toLocalInput(custom ?? Date.now(), tz)} min={toLocalInput(Date.now(), tz)}
              onChange={(e) => { const t = parseLocalInput(e.currentTarget.value, tz); if (t) setCustom(t); }} />
          </label>
        )}
        <div class="chips" role="group" aria-label="What are you in the mood for?">
          {CHIPS.map(([label, word]) => (
            <button type="button" class="chip" aria-pressed={chips.includes(word)}
              onClick={() => setChips(chips.includes(word) ? chips.filter((c) => c !== word) : word === 'surprise me' ? [word] : [...chips.filter((c) => c !== 'surprise me'), word])}>
              {label}
            </button>
          ))}
        </div>
        <div class="say">
          <label class="sr" for="say">Or say it your own way</label>
          <input id="say" type="text" value={draft} placeholder="or say it: “rainy afternoon, two hours, cheap”" autocomplete="off" enterkeyhint="go"
            onInput={(e) => setDraft(e.currentTarget.value)} />
          <button type="submit" class="go">Go</button>
        </div>
        {text && heard.length > 0 && <p class="heard">Heard: {heard.join(', ')}. <button type="button" class="link" onClick={() => { setText(''); setDraft(''); }}>Clear</button></p>}
      </form>

      <main aria-live="polite" aria-busy={!view}>
        {!view && <p class="note">Looking outside…</p>}
        {r?.note && <p class="note">{r.note}</p>}
        {view && r && !r.conditions.known && r.picks.some((p) => p.option.setting === 'out') && (
          <p class="note small">I couldn't get the weather just now, so take the outdoor ideas with a look out the window.</p>
        )}
        <ol class="picks">
          {view && r?.picks.map((p) => (
            <li key={p.option.id}>
              <Card pick={p} now={now} mode={view.req.mode} origin={origin} expanded={open === p.option.id} onToggle={() => setOpen(open === p.option.id ? null : p.option.id)}
                saved={memory.saved.includes(p.option.id)} venueNudge={p.option.placeId ? byId(p.option.placeId)?.nudge : undefined}
                onSave={() => toggleSave(p.option.id)} onShare={() => share(p.option)} onSkip={() => swap(p.option.id)} onGo={() => record(p.option.id, 'go')} />
            </li>
          ))}
        </ol>
        {view && r && r.picks.length > 0 && (
          <p class="again">
            <button class="link" onClick={() => setShuffles((n) => n + 1)}>Ask again</button>
          </p>
        )}
        {debug && view && r && <Debug result={r} />}
      </main>

      <footer>
        <div class="row">
          <button class="link" onClick={() => setSheet(true)}>Saved ({memory.saved.length}/{MAX_SAVED}) · Been ({memory.went.size})</button>
          <button class="link" onClick={() => { const next: Theme = theme === 'auto' ? 'dark' : theme === 'dark' ? 'light' : 'auto'; setTheme(next); saveTheme(next); }}>
            Theme: {theme}
          </button>
        </div>
        <p>
          “Usually open” means the hours haven't been checked by hand yet, so confirm before a long trip. Travel times are estimates. Your history
          stays on this device.
        </p>
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

      {toast && <div class="toast" role="status">{toast}</div>}
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function Card(props: {
  pick: Pick; now: number; mode: Mode; origin: LatLng | null; expanded: boolean; saved: boolean; venueNudge?: string;
  onToggle: () => void; onSave: () => void; onShare: () => void; onSkip: () => void; onGo: () => void;
}) {
  const { pick, expanded } = props;
  const o = pick.option;
  const panel = `more-${o.id}`;
  return (
    <article class={`card${expanded ? ' open' : ''}`}>
      <button class="head" aria-expanded={expanded} aria-controls={panel} onClick={props.onToggle}>
        <span class="kicker">{o.kind === 'event' ? 'Happening' : cap(o.category)} · {o.hood}{o.price === 0 ? ' · free' : ''}</span>
        <span class="name">{o.name}</span>
        <span class="what">{o.what}</span>
      </button>
      <p class="reason">{pick.reason}</p>
      <p class="status">
        <span>{statusLine(pick, props.now, tz)}</span>
        <span>{travelLabel(pick.travelMin, props.mode)}</span>
      </p>
      <div id={panel} hidden={!expanded} class="more">
        <p>{o.story}</p>
        {o.nudge && <p class="nudge"><span>Do this</span>{o.nudge}</p>}
        {!o.nudge && props.venueNudge && <p class="nudge"><span>While you're there</span>{props.venueNudge}</p>}
        {o.url && <p class="source"><a href={o.url} target="_blank" rel="noopener">Details and tickets ({o.source === 'uw' ? 'UW–Madison' : 'Isthmus'})</a></p>}
      </div>
      <div class="actions">
        <a class="primary" href={directionsUrl(o.venue ?? o.name, city.label, props.mode, props.origin ?? undefined)} target="_blank" rel="noopener" onClick={props.onGo}>Directions</a>
        <button onClick={props.onSave} aria-pressed={props.saved}>{props.saved ? 'Saved' : 'Save'}</button>
        <button onClick={props.onShare}>Share</button>
        <button onClick={props.onSkip} aria-label={`Not ${o.name}. Show me something else`}>Not this</button>
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
