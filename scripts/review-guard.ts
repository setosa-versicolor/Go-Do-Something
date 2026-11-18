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

// 2. The floor only goes up.
type Floor = Record<'dev' | 'holdout', Record<string, number>>;
const floorWas = before<Floor>('tagging/baseline.json');
const floorIs = after<Floor>('tagging/baseline.json');
if (floorWas && !floorIs) breaches.push('`tagging/baseline.json` was removed.');
if (floorWas && floorIs) {
  for (const split of ['dev', 'holdout'] as const) {
    for (const [metric, was] of Object.entries(floorWas[split] ?? {})) {
      const is = floorIs[split]?.[metric];
      if (typeof is !== 'number' || is < was) breaches.push(`The floor fell: ${split}.${metric} ${was} → ${is ?? 'missing'}.`);
      else if (is > was) notes.push(`Floor raised: ${split}.${metric} ${was} → ${is}`);
    }
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
console.log(breaches.length ? `**Failed.**\n\n${breaches.map((b) => `- ${b}`).join('\n')}\n` : 'Passed: only allowed files changed, the floor did not fall, no answer key item was removed or moved, and the history was only appended to.\n');
console.log(`- Answer key: ${keyWas.length} → ${keyIs.length} items (${added >= 0 ? '+' : ''}${added}).`);
for (const n of notes) console.log(`- ${n}`);
console.log(relabelled.length ? `\nExisting labels changed (check each one):\n\n${relabelled.join('\n')}` : '\nNo existing label was changed.');
process.exit(breaches.length ? 1 : 0);
