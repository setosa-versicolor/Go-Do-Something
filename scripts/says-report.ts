// What have people typed into the "or say it" box, and how much of it does
// the app understand? Reads the collector's export (worker/README.md).
//
//   SAY_EXPORT_URL=https://…/export SAY_EXPORT_TOKEN=… npm run says
//   npm run says -- --since 2026-11-01      # only from that day on
//   npm run says -- --file rows.json        # from a saved export instead
//
// Read the phrases as what they are: things strangers typed. Never copy them
// anywhere public, and never into the repository.

import { readFileSync } from 'node:fs';
import { sayReport, type SayRow } from '../src/core/says';

const arg = (name: string) => (process.argv.includes(`--${name}`) ? process.argv[process.argv.indexOf(`--${name}`) + 1] : undefined);
const since = arg('since');
const file = arg('file');

let rows: SayRow[];
if (file) rows = (JSON.parse(readFileSync(file, 'utf8')) as { rows: SayRow[] }).rows;
else {
  const url = process.env.SAY_EXPORT_URL;
  const token = process.env.SAY_EXPORT_TOKEN;
  if (!url || !token) {
    console.error('Set SAY_EXPORT_URL and SAY_EXPORT_TOKEN (see worker/README.md), or pass --file.');
    process.exit(1);
  }
  const res = await fetch(`${url}${since ? `?since=${encodeURIComponent(`${since}T00:00Z`)}` : ''}`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) {
    console.error(`The collector answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
    process.exit(1);
  }
  rows = ((await res.json()) as { rows: SayRow[] }).rows;
}

const r = sayReport(rows);
const pct = (n: number) => `${Math.round(n * 100)}%`;
const list = (items: [string, number][]) => (items.length ? items.map(([t, n]) => `  ${String(n).padStart(4)}  ${t}`).join('\n') : '  (none)');
console.log(`${r.typed} typed requests${since ? ` since ${since}` : ''}, ${r.distinct} distinct\n`);
console.log(`Understood none of it:   ${pct(r.lost)}`);
console.log(`Understood only part:    ${pct(r.partly)}`);
console.log(`Came back with no picks: ${pct(r.empty)}`);
console.log(`Lost when typed, understood now: ${r.recovered}\n`);
console.log(`Phrases it is lost on:\n${list(r.lostPhrases)}\n`);
console.log(`Words it steps over:\n${list(r.unheard)}\n`);
console.log(`Typed most often:\n${list(r.common)}`);
