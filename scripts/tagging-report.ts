// How well are loaded events being tagged? Grades the tagger against the
// hand-labelled answer key and profiles a week of real listings.
//
//   npm run events -- --dry --raw tagging/raw-latest.json    # refresh the listings first
//   npm run tagging                    # print the report
//   npm run tagging -- --record        # …and add this run to tagging/history.jsonl
//   npm run tagging -- --misses        # …and list every miss on the dev set
//   npm run tagging -- --compare main  # …and grade the rules as they were on main against the same answer key
//   npm run tagging -- --raise-floor   # …and set tagging/baseline.json to these scores over the whole key (see below)
//
// The process this serves is in tagging/PLAYBOOK.md.

import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { city, venues } from '../src/cities/madison';
import { judge, markOneOffs, toOption, type RawEvent } from '../src/core/events';
import { FLOOR_FIELDS, floorItems, grade, profile, type Floor, type GoldenItem, type Grade } from '../src/core/tagging';
import type { Option } from '../src/core/types';
import { rulesFrom } from './rules-from';

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

const compareRef = process.argv.includes('--compare') ? process.argv[process.argv.indexOf('--compare') + 1] : undefined;
if (compareRef) {
  // The fair before-and-after: the old rules and the new, graded on exactly the same listings and labels.
  const old = await rulesFrom(compareRef);
  console.log(`\n## The rules on ${compareRef} against the same answer key\n`);
  console.log('| set | listings | keep or drop | kind | in/out | kids | turn-up | moods: precision | recall | F1 |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const [name, now] of [['dev', dev], ['holdout', holdout]] as const) {
    console.log(line(`${name}, ${compareRef}`, grade(golden.filter((g) => g.split === name), old)));
    console.log(line(`${name}, now`, now));
  }
}

if (process.argv.includes('--raise-floor')) {
  // The floor is graded only on the items it was set on, so it is a ratchet on those items.
  // Setting it again: first the tagger must hold the old floor on the old items; then the floor covers the
  // whole key, at today's scores. Numbers can come out lower than before when the key gained harder listings.
  // That's not the tagger getting worse, and the review guard checks the old items still hold.
  const floor = read('baseline.json') as Floor;
  const short: string[] = [];
  for (const name of ['dev', 'holdout'] as const) {
    const was = grade(floorItems(golden, floor, name), tag);
    for (const f of FLOOR_FIELDS) if (was[f] < (floor[name][f] ?? 0)) short.push(`${name}.${f} ${was[f]} < ${floor[name][f]}`);
  }
  if (short.length) {
    console.log(`\nThe floor was not set: on the items it was set on, the tagger is below it (${short.join(', ')}).`);
    process.exitCode = 1;
  } else {
    const moved: string[] = [];
    const items = { dev: [] as string[], holdout: [] as string[] };
    for (const [name, g] of [['dev', dev], ['holdout', holdout]] as const) {
      items[name] = golden.filter((x) => x.split === name).map((x) => x.id);
      for (const f of FLOOR_FIELDS) {
        if (g[f] !== floor[name][f]) moved.push(`${name}.${f} ${floor[name][f] ?? '–'} → ${g[f]}`);
        floor[name][f] = g[f];
      }
    }
    const grew = (['dev', 'holdout'] as const).map((n) => items[n].length - (floor.items?.[n] ?? items[n]).length);
    floor.items = items;
    floor.set = new Date().toISOString().slice(0, 10);
    writeFileSync(new URL('../tagging/baseline.json', import.meta.url), JSON.stringify(floor, null, 2) + '\n');
    console.log(`\nFloor set on ${items.dev.length} dev and ${items.holdout.length} holdout items (+${grew[0]}, +${grew[1]}). ${moved.length ? `Moved: ${moved.join(', ')}` : 'No number moved.'}`);
  }
}
