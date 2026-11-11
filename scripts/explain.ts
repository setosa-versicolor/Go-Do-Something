// Why did it pick that? Run the real matcher from the command line and print
// every score part and every rejection.
//
//   npm run explain -- "date night" --at 2026-11-13T19:00 --hours 3 --mode walk --weather
//
// --at is Madison wall time. Without --weather, weather is unknown (as offline).

import { city, places } from '../src/cities/madison';
import { readFileSync } from 'node:fs';
import { loadEvents } from '../src/core/events';
import { summarize } from '../src/core/history';
import { parseIntent, resolveStart } from '../src/core/intent';
import { match, statusLine } from '../src/core/match';
import type { Mode } from '../src/core/geo';
import { fmtDay, fmtTime, parseLocalInput } from '../src/core/time';
import { fetchWeather } from '../src/core/weather';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? undefined : args.splice(i, 2)[1];
};
const useWeather = args.includes('--weather') && args.splice(args.indexOf('--weather'), 1).length > 0;
const atArg = flag('at');
const hours = flag('hours');
const mode = (flag('mode') ?? 'drive') as Mode;
const seed = Number(flag('seed') ?? 1);
const say = args.join(' ');

const now = atArg ? parseLocalInput(atArg, city.tz) ?? Date.now() : Date.now();
const intent = parseIntent(say);
const start = resolveStart(intent.start, now, city.tz);
// The same events file the app reads, judged the same way.
let events: ReturnType<typeof loadEvents> = [];
try {
  events = loadEvents(JSON.parse(readFileSync(new URL('../public/events.json', import.meta.url), 'utf8')), now);
} catch {
  /* no events file yet */
}
const options = [...places, ...events];
const weather = useWeather ? await fetchWeather(city.center, Date.now()) : null;
const result = match(
  { now, start, durationMin: hours ? Number(hours) * 60 : intent.durationMin ?? 120, origin: city.center, mode, intent, seed },
  { city, options, weather, memory: summarize([], options, now) },
);

console.log(`\n"${say}" — ${fmtDay(start, now, city.tz)} at ${fmtTime(start, city.tz)}, ${mode}, heard: [${intent.heard.join(', ')}]`);
console.log(`weather: ${result.conditions.known ? result.conditions.summary : 'unknown'} · sunset ${fmtTime(result.sun.sunset, city.tz)}`);
if (result.note) console.log(`note: ${result.note}`);
for (const p of result.picks) {
  console.log(`\n  ${p.wildcard ? '↯' : '•'} ${p.option.name} — ${p.option.what}`);
  console.log(`    ${statusLine(p, now, city.tz)} · ${p.travelMin} min · stay ~${p.stayMin} min`);
  console.log(`    ${p.reason}`);
  console.log(`    ${p.score.toFixed(2)} = ${Object.entries(p.parts).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', ')}`);
}
console.log(`\nnext best: ${result.debug.ranked.filter((r) => !result.picks.some((p) => p.option.id === r.option.id)).slice(0, 6).map((r) => `${r.option.id} ${r.score.toFixed(2)}`).join(', ')}`);
const by = new Map<string, string[]>();
for (const r of result.debug.rejected) by.set(r.gate, [...(by.get(r.gate) ?? []), r.id]);
for (const [gate, ids] of by) console.log(`rejected (${gate}, ${ids.length}): ${ids.join(', ')}`);
