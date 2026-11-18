// The tagging review's guardrails, checked by a script rather than trusted to
// whoever ran the review. The scheduled workflow (.github/workflows/tagging-review.yml)
// runs this on the review's changes before anything is pushed, and stops if it fails.
//
//   npm run review-guard              # compare the working tree with origin/main
//   npm run review-guard -- --base <ref>
//
// Prints a short markdown report (it goes into the pull request) and exits 1 on any breach.
// The rules are the guardrails in tagging/PLAYBOOK.md.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { city, venues } from '../src/cities/madison';
import { toOption } from '../src/core/events';
import { FLOOR_FIELDS, floorItems, grade, type Floor, type GoldenItem } from '../src/core/tagging';
import { rulesFrom } from './rules-from';

const arg = (name: string) => (process.argv.includes(`--${name}`) ? process.argv[process.argv.indexOf(`--${name}`) + 1] : undefined);
const base = arg('base') ?? 'origin/main';
const git = (...a: string[]) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

/** What a review may change. The grader (src/core/tagging.ts, the report script, tests/tagging.test.ts) is not on it. */
const ALLOWED = [/^tagging\//, /^src\/core\/events\.ts$/, /^src\/cities\/madison\/venues\.ts$/, /^tests\/(?!tagging\.test\.ts$)[\w.-]+\.test\.ts$/];

const breaches: string[] = [];
const notes: string[] = [];

// 1. Only the files the playbook says a review may touch.
const changed = [
  ...git('diff', '--name-only', base, '--').split('\n'),
  ...git('ls-files', '--others', '--exclude-standard').split('\n'),
].filter(Boolean);
for (const f of new Set(changed)) if (!ALLOWED.some((re) => re.test(f))) breaches.push(`\`${f}\` is outside what a tagging review may change.`);

const before = <T>(path: string): T | null => {
  try {
    return JSON.parse(git('show', `${base}:${path}`)) as T;
  } catch {
    return null;
  }
};
const after = <T>(path: string): T | null => (existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : null);

// 2. The floor. It is graded on the items it was set on, so it can be set again over a grown key at lower
//    aggregate numbers. What may not happen: the new rules falling below the old floor on the old items,
//    an item leaving the floor, or a floor number that isn't the tagger's real score (hand-lowered).
const floorWas = before<Floor>('tagging/baseline.json');
const floorIs = after<Floor>('tagging/baseline.json');
const keyWasForFloor = before<{ items: GoldenItem[] }>('tagging/golden.json')?.items ?? [];
const keyNow = after<{ items: GoldenItem[] }>('tagging/golden.json')?.items ?? [];
const tag = (listing: GoldenItem['listing']) => toOption(listing, venues, city.center);
if (floorWas && !floorIs) breaches.push('`tagging/baseline.json` was removed.');
if (floorWas && floorIs) {
  for (const split of ['dev', 'holdout'] as const) {
    // The old floor's items, with today's labels (any changed label is listed below for a person to check).
    const oldIds = floorItems(keyWasForFloor, floorWas, split).map((g) => g.id);
    const onOld = grade(keyNow.filter((g) => oldIds.includes(g.id)), tag);
    for (const f of FLOOR_FIELDS) {
      const least = floorWas[split][f];
      if (typeof least === 'number' && onOld[f] < least) breaches.push(`Below the old floor on the items it was set on: ${split}.${f} ${onOld[f]} < ${least}.`);
    }
    const newIds = floorIs.items?.[split] ?? [];
    const dropped = oldIds.filter((id) => !newIds.includes(id));
    if (dropped.length) breaches.push(`Items left the ${split} floor: ${dropped.join(', ')}.`);
    if (floorIs.items?.[split]) {
      const real = grade(floorItems(keyNow, floorIs, split), tag);
      for (const f of FLOOR_FIELDS) {
        const is = floorIs[split][f];
        if (typeof is !== 'number' || Math.abs(is - real[f]) > 0.0015) breaches.push(`The floor's ${split}.${f} is ${is ?? 'missing'}, but the tagger scores ${real[f]} on its items: set it with \`npm run tagging -- --raise-floor\`, not by hand.`);
        else if (is !== floorWas[split][f]) notes.push(`Floor ${split}.${f} ${floorWas[split][f] ?? '–'} → ${is} (now over ${newIds.length} items, was ${oldIds.length})`);
      }
    } else if (JSON.stringify(floorIs[split]) !== JSON.stringify(floorWas[split])) {
      breaches.push(`The ${split} floor changed without saying which items it was set on: set it with \`npm run tagging -- --raise-floor\`.`);
    }
  }
}

// 2b. The fair before-and-after: the rules on the base and the rules now, graded on the same listings and labels.
//     Holdout may not get worse on any floor field. Dev is reported.
const fair: string[] = [];
if (keyNow.length) {
  const old = await rulesFrom(base);
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  fair.push('| set | listings | rules | ' + FLOOR_FIELDS.join(' | ') + ' |', '| --- | --- | --- |' + ' --- |'.repeat(FLOOR_FIELDS.length));
  for (const split of ['dev', 'holdout'] as const) {
    const items = keyNow.filter((g) => g.split === split);
    const was = grade(items, old);
    const is = grade(items, tag);
    fair.push(`| ${split} | ${items.length} | before | ${FLOOR_FIELDS.map((f) => pct(was[f])).join(' | ')} |`);
    fair.push(`| ${split} | ${items.length} | after | ${FLOOR_FIELDS.map((f) => pct(is[f])).join(' | ')} |`);
    if (split === 'holdout') for (const f of FLOOR_FIELDS) if (is[f] < was[f]) breaches.push(`Holdout got worse than the old rules on the same listings: ${f} ${was[f]} → ${is[f]}.`);
  }
}

// 3. The answer key: nothing removed, nothing moved between dev and holdout, the listings themselves untouched.
//    Labels may be corrected when plainly wrong; every correction is listed for a person to check.
interface Item { id: string; split: string; listing: unknown; expect: unknown }
const keyWas = before<{ items: Item[] }>('tagging/golden.json')?.items ?? [];
const keyIs = after<{ items: Item[] }>('tagging/golden.json')?.items ?? [];
const byId = new Map(keyIs.map((g) => [g.id, g]));
const relabelled: string[] = [];
for (const old of keyWas) {
  const now = byId.get(old.id);
  if (!now) breaches.push(`Answer key item ${old.id} was removed.`);
  else {
    if (now.split !== old.split) breaches.push(`Answer key item ${old.id} moved from ${old.split} to ${now.split}.`);
    if (JSON.stringify(now.listing) !== JSON.stringify(old.listing)) breaches.push(`Answer key item ${old.id}: the listing itself was edited.`);
    if (JSON.stringify(now.expect) !== JSON.stringify(old.expect)) relabelled.push(`- ${old.id}: \`${JSON.stringify(old.expect)}\` → \`${JSON.stringify(now.expect)}\``);
  }
}
const added = keyIs.length - keyWas.length;

// 4. The history is only ever added to.
let historyWas = '';
try {
  historyWas = git('show', `${base}:tagging/history.jsonl`);
} catch {
  /* none yet */
}
const historyIs = existsSync('tagging/history.jsonl') ? readFileSync('tagging/history.jsonl', 'utf8') : '';
if (!historyIs.startsWith(historyWas)) breaches.push('`tagging/history.jsonl` was rewritten, not appended to.');

console.log('### Guardrail check\n');
console.log(breaches.length ? `**Failed.**\n\n${breaches.map((b) => `- ${b}`).join('\n')}\n` : 'Passed: only allowed files changed, the rules hold the old floor on the items it was set on, holdout is no worse than the old rules on the same listings, no answer key item was removed or moved, and the history was only appended to.\n');
if (fair.length) console.log(`The old rules and the new on the same answer key:\n\n${fair.join('\n')}\n`);
console.log(`- Answer key: ${keyWas.length} → ${keyIs.length} items (${added >= 0 ? '+' : ''}${added}).`);
for (const n of notes) console.log(`- ${n}`);
console.log(relabelled.length ? `\nExisting labels changed (check each one):\n\n${relabelled.join('\n')}` : '\nNo existing label was changed.');
process.exit(breaches.length ? 1 : 0);
