// How well are loaded events being tagged? Grades the tagger against the
// hand-labelled answer key and profiles a week of real listings.
//
//   npm run events -- --dry --raw tagging/raw-latest.json    # refresh the listings first
//   npm run tagging                    # print the report
//   npm run tagging -- --record        # …and add this run to tagging/history.jsonl
//   npm run tagging -- --misses        # …and list every miss on the dev set
//   npm run tagging -- --raise-floor   # …and lift tagging/baseline.json to these scores, wherever they are higher
//
// The process this serves is in tagging/PLAYBOOK.md.

import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { city, venues } from '../src/cities/madison';
import { judge, markOneOffs, toOption, type RawEvent } from '../src/core/events';
import { grade, profile, type GoldenItem, type Grade } from '../src/core/tagging';
import type { Option } from '../src/core/types';

const read = (path: string) => JSON.parse(readFileSync(new URL(`../tagging/${path}`, import.meta.url), 'utf8'));
const golden = (read('golden.json') as { items: GoldenItem[] }).items;
const raw = read('raw-latest.json') as { fetchedAt: number; listings: RawEvent[] };
const tag = (listing: RawEvent) => toOption(listing, venues, city.center);

const dev = grade(golden.filter((g) => g.split === 'dev'), tag);
const holdout = grade(golden.filter((g) => g.split === 'holdout'), tag);

const dropped: Record<string, number> = {};
const kept: Option[] = [];
for (const listing of raw.listings) {
  const verdict = judge(listing, venues, city.center);
  if ('option' in verdict) kept.push(verdict.option);
  else dropped[verdict.dropped] = (dropped[verdict.dropped] ?? 0) + 1;
}
const week = profile(raw.listings.length, markOneOffs(kept, raw.listings), dropped);

const pct = (n: number) => `${Math.round(n * 100)}%`.padStart(4);
const line = (label: string, g: Grade) =>
  `| ${label} | ${g.items} | ${pct(g.keep)} | ${pct(g.category)} | ${pct(g.setting)} | ${pct(g.kids)} | ${pct(g.dropIn)} | ${pct(g.moodPrecision)} | ${pct(g.moodRecall)} | ${pct(g.moodF1)} |`;

console.log(`## Accuracy against the answer key (${golden.length} hand-labelled listings)\n`);
console.log('| set | listings | keep or drop | kind | in/out | kids | turn-up | moods: precision | recall | F1 |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
console.log(line('dev', dev));
console.log(line('holdout', holdout));
console.log(`\n## This week's listings (fetched ${new Date(raw.fetchedAt).toISOString().slice(0, 10)})\n`);
console.log(`- ${week.listings} listings, ${week.kept} kept: coverage ${pct(week.coverage).trim()}`);
console.log(`- dropped: ${Object.entries(week.dropped).sort((a, b) => b[1] - a[1]).map(([why, n]) => `${n} ${why}`).join(', ')}`);
console.log(`- couldn't classify: ${pct(week.unclassified).trim()} of listings`);
console.log(`- mood diversity ${week.diversity} (0 = all alike, 1 = evenly spread); commonest mood "${week.commonest.mood}" on ${pct(week.commonest.share).trim()} of events`);
console.log(`- moods no event carries: ${week.silent.join(', ') || 'none'}`);
console.log(`- outdoors ${pct(week.outdoors).trim()}, for families ${pct(week.families).trim()}, adults only ${pct(week.adultsOnly).trim()}, one-offs ${pct(week.oneOffs).trim()}`);
console.log(`\n| mood | share of events |\n| --- | --- |\n${Object.entries(week.moodShare).sort((a, b) => b[1] - a[1]).map(([m, s]) => `| ${m} | ${pct(s)} |`).join('\n')}`);
console.log(`\n| what a person taps | share of events that answer it |\n| --- | --- |\n${Object.entries(week.reach).map(([k, s]) => `| ${k} | ${pct(s)} |`).join('\n')}`);

if (process.argv.includes('--misses')) {
  console.log('\n## Misses on the dev set\n');
  for (const m of dev.misses) console.log(`- ${m.id}  ${m.title}  —  ${m.field}: expected ${m.expected}, got ${m.got}`);
  console.log(`\n(${holdout.misses.length} misses on the holdout set are not listed: that set is for judging, not for tuning.)`);
}

if (process.argv.includes('--record')) {
  const { misses: _d, ...d } = dev;
  const { misses: _h, ...h } = holdout;
  const entry = { at: new Date().toISOString(), listingsFetched: new Date(raw.fetchedAt).toISOString(), golden: golden.length, dev: d, holdout: h, week };
  appendFileSync(new URL('../tagging/history.jsonl', import.meta.url), JSON.stringify(entry) + '\n');
  console.log('\nRecorded in tagging/history.jsonl');
}

if (process.argv.includes('--raise-floor')) {
  // A ratchet: the floor only ever goes up.
  const FIELDS = ['keep', 'category', 'setting', 'kids', 'dropIn', 'moodF1'] as const;
  const floor = read('baseline.json') as { about: string; set: string; dev: Record<string, number>; holdout: Record<string, number> };
  const lifted: string[] = [];
  for (const [name, g] of [['dev', dev], ['holdout', holdout]] as const) {
    for (const f of FIELDS) {
      if (g[f] > (floor[name][f] ?? 0)) {
        lifted.push(`${name}.${f} ${floor[name][f] ?? 0} → ${g[f]}`);
        floor[name][f] = g[f];
      }
    }
  }
  floor.set = new Date().toISOString().slice(0, 10);
  writeFileSync(new URL('../tagging/baseline.json', import.meta.url), JSON.stringify(floor, null, 2) + '\n');
  console.log(lifted.length ? `\nFloor raised: ${lifted.join(', ')}` : '\nNothing beat the floor; it stays where it was.');
}
