// Redraws the lakes on the loading screen in index.html from the model's own
// shorelines. At that size (about 15rem across) the real outlines have too
// much detail: Picnic Point, the neck of Monona Bay and every pier turn into
// stray marks in the water. So this cuts thin necks and spikes, rounds the
// corners, and writes simplified paths into the <defs> of #boot.
//
//   npm run boot-lakes

import { readFileSync, writeFileSync } from 'node:fs';
import { shape } from '../src/cities/madison/shape';

/** Screen units per mile: the boot map's viewBox is in these. */
const SCALE = 30;
/** A neck narrower than this (in units, about a pixel each on screen) is closed off. */
const NECK = 7;
/** Never cut more than this much shoreline in one go: that's a bay worth keeping. */
const MAX_CUT = 70;
const LAKES: [id: string, name: string][] = [['bl-me', 'Lake Mendota'], ['bl-mo', 'Lake Monona'], ['bl-wi', 'Lake Wingra']];

type P = [number, number];
const dist = (a: P, b: P) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Drops the stretch between two points that come close again after a long way round: a spike, a pier, a thin point or inlet. */
function cutNecks(pts: P[]): P[] {
  let changed = true;
  while (changed) {
    changed = false;
    const n = pts.length;
    outer: for (let i = 0; i < n; i++) {
      let arc = 0;
      let best = -1;
      for (let k = 1; k < n / 2; k++) {
        arc += dist(pts[(i + k - 1) % n]!, pts[(i + k) % n]!);
        if (arc > MAX_CUT) break;
        const d = dist(pts[i]!, pts[(i + k) % n]!);
        if (k > 1 && d < NECK && arc > 1.6 * d + 1.5) best = k;
      }
      if (best > 0) {
        const keep: P[] = [];
        for (let k = best; k <= n; k++) keep.push(pts[(i + k) % n]!);
        pts = keep;
        changed = true;
        break outer;
      }
    }
  }
  return pts;
}

/** Chaikin corner cutting, closed. */
function soften(pts: P[]): P[] {
  const out: P[] = [];
  pts.forEach((a, i) => {
    const b = pts[(i + 1) % pts.length]!;
    out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
  });
  return out;
}

/** Ramer–Douglas–Peucker on an open run. */
function simplify(pts: P[], eps: number): P[] {
  if (pts.length < 3) return pts;
  const a = pts[0]!, b = pts[pts.length - 1]!;
  const len = dist(a, b) || 1;
  let far = 0, max = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i]!;
    const d = Math.abs((b[1] - a[1]) * p[0] - (b[0] - a[0]) * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
    if (d > max) { max = d; far = i; }
  }
  if (max <= eps) return [a, b];
  return [...simplify(pts.slice(0, far + 1), eps).slice(0, -1), ...simplify(pts.slice(far), eps)];
}

/** Simplifies a closed ring by splitting it at the point farthest from the start. */
function simplifyRing(pts: P[], eps: number): P[] {
  let far = 0;
  pts.forEach((p, i) => { if (dist(p, pts[0]!) > dist(pts[far]!, pts[0]!)) far = i; });
  return [...simplify(pts.slice(0, far + 1), eps).slice(0, -1), ...simplify([...pts.slice(far), pts[0]!], eps).slice(0, -1)];
}

const r = (v: number) => Math.round(v * 2) / 2;
let html = readFileSync('index.html', 'utf8');
for (const [id, name] of LAKES) {
  const o = shape.lakes.find((l) => l.name === name)!.outline;
  let pts: P[] = [];
  for (let i = 0; i < o.length; i += 2) pts.push([o[i]! * SCALE, -o[i + 1]! * SCALE]); // north is up
  pts = simplifyRing(soften(soften(cutNecks(pts))), 0.45);
  const d = 'M' + pts.map(([x, y]) => `${r(x)} ${r(y)}`).join('L') + 'Z';
  const re = new RegExp(`(<path id="${id}" pathLength="100" d=")[^"]*(")`);
  if (!re.test(html)) throw new Error(`No ${id} path in index.html`);
  html = html.replace(re, `$1${d}$2`);
  console.log(`${name}: ${o.length / 2} points → ${pts.length}`);
}
writeFileSync('index.html', html);
