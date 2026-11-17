// Things to do on a frozen lake: push the snow around, and watch fish skid.
//
// The snow on the ice is a grid of depths, kept on the CPU. A finger held down on it and then dragged is a small
// plough: whatever lies under it is shoved out to its rim, mostly ahead and to the sides, so a ridge builds in
// front and is pushed along, and berms are left either side of a bare track. Then the snow settles the way
// heaped snow does: wherever one cell stands more than a set height above its neighbour (the angle of repose),
// some slides down to it, and keeps sliding over the next frames until every slope is gentle enough to stand.
// Snow is only moved, never made or lost, except that falling snow slowly fills the hollows back in. The ice
// shader reads the depths to draw it: bare where it was cleared (so the sun glints there again), whiter on the
// heaps, and shaded on their slopes.
//
// A tapped ice shanty sends out a few fish, as if someone had flung up a hatch. They sail out, land on their sides
// and skid, quick on bare ice, slow in snow (where they plough a little furrow), bounce off each other, the shanties
// and the shore, flop about where they stop, and then hop home and dive back in.

import * as THREE from 'three';

export interface Drift {
  texture: THREE.DataTexture;
  /** Scene x and z of the grid's corner, and one over its width and depth, for the shader to find its place in it. */
  box: THREE.Vector4;
  /** One cell, as a fraction of the grid across and down. */
  px: THREE.Vector2;
  /** Miles a side of one cell. */
  cell: number;
  /** Depth here, where 1 is the snow as it lies. 1 off the ice. */
  at(x: number, z: number): number;
  /** Plough a disc of radius `r` from (x0, z0) to (x1, z1). The same point twice is a dent, its snow pushed to the rim. */
  plow(x0: number, z0: number, x1: number, z1: number, r: number): void;
  /** Settle what was pushed, upload what changed, and let falling snow fill the hollows. */
  step(dt: number, snowing: boolean): void;
  /** Smooth it all back, for a fresh freeze. */
  reset(): void;
}

/**
 * A grid over the lakes (outlines in miles east and north), clipped to `reach` miles of the center.
 * Null if there is no room for one.
 */
export function createDrift(lakes: number[][], reach: number, lowMemory: boolean): Drift | null {
  let e0 = Infinity, e1 = -Infinity, n0 = Infinity, n1 = -Infinity;
  for (const o of lakes) for (let i = 0; i < o.length; i += 2) {
    e0 = Math.min(e0, o[i]!); e1 = Math.max(e1, o[i]!);
    n0 = Math.min(n0, o[i + 1]!); n1 = Math.max(n1, o[i + 1]!);
  }
  e0 = Math.max(e0, -reach); e1 = Math.min(e1, reach);
  n0 = Math.max(n0, -reach); n1 = Math.min(n1, reach);
  if (!(e1 > e0 && n1 > n0)) return null;
  // Scene coordinates: x is east, z is south.
  const x0 = e0, z0 = -n1;
  const most = lowMemory ? 480 : 760;
  const cell = Math.max(0.016, (e1 - e0) / most, (n1 - n0) / most);
  const nx = Math.ceil((e1 - e0) / cell);
  const nz = Math.ceil((n1 - n0) / cell);

  // Which cells are ice: the lakes, drawn once.
  const lake = new Uint8Array(nx * nz);
  {
    const c = document.createElement('canvas');
    c.width = nx;
    c.height = nz;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (!g) return null;
    g.fillStyle = '#fff';
    for (const o of lakes) {
      g.beginPath();
      for (let i = 0; i < o.length; i += 2) g.lineTo((o[i]! - x0) / cell, (-o[i + 1]! - z0) / cell);
      g.closePath();
      g.fill();
    }
    const px = g.getImageData(0, 0, nx, nz).data;
    for (let i = 0; i < nx * nz; i++) lake[i] = px[i * 4 + 3]! > 127 ? 1 : 0;
  }

  const h = new Float32Array(nx * nz).fill(1);
  const flow = new Float32Array(nx * nz);
  const bytes = new Uint8Array(nx * nz);
  /** Depth 0 to 3, in a byte. */
  const SCALE = 85;
  bytes.fill(SCALE);
  const texture = new THREE.DataTexture(bytes, nx, nz, THREE.RedFormat, THREE.UnsignedByteType);
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  // Where the snow is still settling, and where the texture is out of date, in cells.
  const none = () => ({ a: nx, b: nz, c: -1, d: -1 });
  let settling = none();
  let stale = none();
  const grow = (r: { a: number; b: number; c: number; d: number }, a: number, b: number, c: number, d: number) => {
    r.a = Math.max(1, Math.min(r.a, a)); r.b = Math.max(1, Math.min(r.b, b));
    r.c = Math.min(nx - 2, Math.max(r.c, c)); r.d = Math.min(nz - 2, Math.max(r.d, d));
  };
  let changed = false;
  let refill = 0;

  /** Steepest a heap stands, as a difference in depth from one cell to the next. */
  const REPOSE = 0.5;
  const pushes: number[] = [];

  const add = (x: number, z: number, amount: number) => {
    // Shared between the four nearest cells, so a heap moves smoothly and not by whole cells.
    const fx = (x - x0) / cell - 0.5;
    const fz = (z - z0) / cell - 0.5;
    const i = Math.floor(fx), k = Math.floor(fz);
    const u = fx - i, v = fz - k;
    const w = [(1 - u) * (1 - v), u * (1 - v), (1 - u) * v, u * v];
    const at = [[i, k], [i + 1, k], [i, k + 1], [i + 1, k + 1]] as const;
    let kept = 0;
    for (let q = 0; q < 4; q++) {
      const [a, b] = at[q]!;
      if (a < 1 || b < 1 || a >= nx - 1 || b >= nz - 1 || !lake[b * nx + a]) continue;
      kept += w[q]!;
    }
    if (kept < 0.01) return false;
    for (let q = 0; q < 4; q++) {
      const [a, b] = at[q]!;
      if (a < 1 || b < 1 || a >= nx - 1 || b >= nz - 1 || !lake[b * nx + a]) continue;
      h[b * nx + a]! += (amount * w[q]!) / kept;
    }
    return true;
  };

  const push = (px: number, pz: number, dx: number, dz: number, r: number) => {
    const ci = Math.floor((px - x0) / cell), ck = Math.floor((pz - z0) / cell);
    const span = Math.ceil(r / cell) + 1;
    pushes.length = 0;
    for (let k = Math.max(1, ck - span); k <= Math.min(nz - 2, ck + span); k++) {
      for (let i = Math.max(1, ci - span); i <= Math.min(nx - 2, ci + span); i++) {
        const j = k * nx + i;
        if (!lake[j] || h[j]! <= 0) continue;
        const cx = x0 + (i + 0.5) * cell - px;
        const cz = z0 + (k + 0.5) * cell - pz;
        const d = Math.hypot(cx, cz);
        if (d >= r) continue;
        // A clean cut in the middle, softening to nothing at the rim.
        const take = h[j]! * 0.92 * Math.min(1, (r - d) / (r * 0.3));
        // Out to the rim: away from the middle, bent toward the way it is going, so most of it gathers in front.
        let ox = cx / r + dx * 0.9, oz = cz / r + dz * 0.9;
        const o = Math.hypot(ox, oz);
        if (o < 1e-4) { ox = dx || 1; oz = dz; } else { ox /= o; oz /= o; }
        pushes.push(j, take, px + ox * r * 1.12, pz + oz * r * 1.12);
      }
    }
    for (let q = 0; q < pushes.length; q += 4) {
      const j = pushes[q]!, take = pushes[q + 1]!;
      h[j]! -= take;
      // Where the rim is on land, the snow stays where it was.
      if (!add(pushes[q + 2]!, pushes[q + 3]!, take)) h[j]! += take;
    }
    const pad = span + 3;
    grow(settling, ci - pad, ck - pad, ci + pad, ck + pad);
    grow(stale, ci - pad, ck - pad, ci + pad, ck + pad);
  };

  const settle = () => {
    const r = settling;
    if (r.c < r.a) return;
    let most = 0;
    let a = nx, b = nz, c = -1, d = -1;
    for (let k = r.b - 1; k <= r.d + 1; k++) for (let i = r.a - 1; i <= r.c + 1; i++) flow[k * nx + i] = 0;
    for (let k = r.b; k <= r.d; k++) {
      for (let i = r.a; i <= r.c; i++) {
        const j = k * nx + i;
        if (!lake[j]) continue;
        const hj = h[j]!;
        for (const n of [j - 1, j + 1, j - nx, j + nx]) {
          if (!lake[n]) continue;
          const over = hj - h[n]! - REPOSE;
          if (over <= 0) continue;
          const f = over * 0.12;
          flow[j]! -= f;
          flow[n]! += f;
          if (f > most) most = f;
          if (f > 2e-4) { a = Math.min(a, i); b = Math.min(b, k); c = Math.max(c, i); d = Math.max(d, k); }
        }
      }
    }
    for (let k = r.b - 1; k <= r.d + 1; k++) for (let i = r.a - 1; i <= r.c + 1; i++) h[k * nx + i]! += flow[k * nx + i]!;
    grow(stale, r.a - 1, r.b - 1, r.c + 1, r.d + 1);
    // Keep going only around what is still sliding.
    settling = none();
    if (most > 2e-4) grow(settling, a - 2, b - 2, c + 2, d + 2);
  };

  const upload = () => {
    const r = stale;
    if (r.c < r.a) return;
    for (let k = r.b; k <= r.d; k++) for (let i = r.a; i <= r.c; i++) {
      const j = k * nx + i;
      bytes[j] = Math.max(0, Math.min(255, Math.round(h[j]! * SCALE)));
    }
    stale = none();
    texture.needsUpdate = true;
  };

  return {
    texture,
    box: new THREE.Vector4(x0, z0, 1 / (nx * cell), 1 / (nz * cell)),
    px: new THREE.Vector2(1 / nx, 1 / nz),
    cell,
    at(x, z) {
      const i = Math.floor((x - x0) / cell), k = Math.floor((z - z0) / cell);
      if (i < 0 || k < 0 || i >= nx || k >= nz) return 1;
      return lake[k * nx + i] ? h[k * nx + i]! : 1;
    },
    plow(ax, az, bx, bz, r) {
      r = Math.max(r, cell * 1.2);
      const len = Math.hypot(bx - ax, bz - az);
      const dx = len > 1e-6 ? (bx - ax) / len : 0;
      const dz = len > 1e-6 ? (bz - az) / len : 0;
      // In short strides, so a fast drag still leaves an unbroken track.
      const steps = Math.max(1, Math.ceil(len / (r * 0.35)));
      for (let s = 1; s <= steps; s++) push(ax + (bx - ax) * (s / steps), az + (bz - az) * (s / steps), dx, dz, r);
      changed = true;
    },
    step(dt, snowing) {
      for (let n = 0; n < 3; n++) settle();
      // Falling snow fills the hollows (a whole pass over the grid, so not every frame).
      if (snowing && changed) {
        refill += dt;
        if (refill > 0.5) {
          const k = 1 - Math.exp(-refill * 0.02);
          refill = 0;
          for (let j = 0; j < h.length; j++) if (lake[j] && h[j]! < 1) h[j]! += (1 - h[j]!) * k;
          grow(stale, 1, 1, nx - 2, nz - 2);
        }
      }
      upload();
    },
    reset() {
      if (!changed) return;
      h.fill(1);
      bytes.fill(SCALE);
      settling = none();
      stale = none();
      changed = false;
      texture.needsUpdate = true;
    },
  };
}

// ------------------------------------------------------------ fish

export interface Fish {
  /** A handful of fish out of a shanty at (x, z). */
  launch(x: number, z: number): void;
  step(dt: number, world: FishWorld): void;
  clear(): void;
}

export interface FishWorld {
  /** Is this spot on the ice, clear of the shore? */
  onIce(x: number, z: number): boolean;
  /** How much snow is here, 0 (bare) to about 1 (as it lies) and more on a heap. */
  snowAt(x: number, z: number): number;
  /** Plough snow, as a fish skidding through it does. */
  plow(x0: number, z0: number, x1: number, z1: number, r: number): void;
  /** What they bounce off: the shanties. */
  shanties: { x: number; z: number }[];
}

const SPECIES = [
  { body: '#c9b13a', fin: '#d8742e', bars: true }, // perch
  { body: '#5f7f4f', fin: '#e0873a', bars: false }, // bluegill
  { body: '#b8a56c', fin: '#8f7a46', bars: false }, // walleye
  { body: '#c9b13a', fin: '#d8742e', bars: true },
];
const GRAVITY = 3.2;
const ICE = 0.014;
const MAX = 30;
const SHANTY = 0.07;

interface One {
  g: THREE.Group; size: number; born: number;
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  yaw: number; yawV: number; roll: number; rollV: number; rollTo: number;
  phase: 'fly' | 'skid' | 'rest' | 'home' | 'gone'; t: number; next: number; homeX: number; homeZ: number; fade: number;
}

export function createFish(scene: THREE.Scene): Fish {
  // A fish lying on its side on the ice: from above, its profile. Long along x, flat in y.
  const bodyGeo = new THREE.SphereGeometry(1, 12, 6);
  bodyGeo.scale(0.03, 0.007, 0.012);
  // (Bigger than life, like everything else here, or they would be specks.)
  const tail = new THREE.BufferGeometry();
  tail.setAttribute('position', new THREE.Float32BufferAttribute([-0.024, 0, 0, -0.044, 0, 0.013, -0.044, 0, -0.013], 3));
  tail.computeVertexNormals();
  const fin = new THREE.BufferGeometry();
  fin.setAttribute('position', new THREE.Float32BufferAttribute([0.008, 0, 0.009, -0.012, 0, 0.009, -0.004, 0, 0.019], 3));
  fin.computeVertexNormals();
  const barGeo = new THREE.BoxGeometry(0.004, 0.0155, 0.016);
  const mats = SPECIES.map((s) => ({
    body: new THREE.MeshLambertMaterial({ color: s.body }),
    fin: new THREE.MeshLambertMaterial({ color: s.fin, side: THREE.DoubleSide }),
    bar: new THREE.MeshLambertMaterial({ color: '#4a4a22' }),
    bars: s.bars,
  }));

  const all: One[] = [];
  let clock = 0;

  const make = (): One => {
    const m = mats[Math.floor(Math.random() * mats.length)]!;
    const g = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, m.body);
    body.castShadow = true;
    g.add(body, new THREE.Mesh(tail, m.fin), new THREE.Mesh(fin, m.fin));
    if (m.bars) for (const at of [-0.01, 0.0, 0.01]) {
      const bar = new THREE.Mesh(barGeo, m.bar);
      bar.position.x = at;
      g.add(bar);
    }
    scene.add(g);
    const size = (0.85 + Math.random() * 0.5) * 1.45;
    return { g, size, born: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, yawV: 0, roll: 0, rollV: 0, rollTo: 0,
      phase: 'gone', t: 0, next: 0, homeX: 0, homeZ: 0, fade: 1 };
  };

  // Every fish shares the same few geometries and materials, so letting one go is only taking it out of the scene.
  const drop = (f: One) => scene.remove(f.g);

  const nearestFlat = (a: number) => Math.round(a / Math.PI) * Math.PI;

  return {
    launch(x, z) {
      const n = 2 + Math.floor(Math.random() * 3);
      const out = Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        while (all.length >= MAX) drop(all.shift()!);
        const f = make();
        const a = out + (i - (n - 1) / 2) * 0.55 + (Math.random() - 0.5) * 0.4;
        const speed = 0.35 + Math.random() * 0.5;
        f.born = clock + i * 0.09;
        f.x = x + Math.cos(a) * 0.035;
        f.z = z + Math.sin(a) * 0.035;
        f.y = 0.07;
        f.vx = Math.cos(a) * speed;
        f.vz = Math.sin(a) * speed;
        f.vy = 0.5 + Math.random() * 0.35;
        f.yaw = -a;
        f.yawV = (Math.random() - 0.5) * 18;
        f.rollV = (Math.random() < 0.5 ? -1 : 1) * (10 + Math.random() * 10);
        f.phase = 'fly';
        f.homeX = x;
        f.homeZ = z;
        f.g.visible = false;
        all.push(f);
      }
    },
    step(dt, world) {
      clock += dt;
      for (const f of all) {
        if (clock < f.born) continue;
        f.g.visible = true;
        const wasX = f.x, wasZ = f.z;
        if (f.phase === 'fly' || f.phase === 'home' || f.phase === 'rest') {
          // In the air, or a flop.
          f.vy -= GRAVITY * dt;
          f.y += f.vy * dt;
          f.x += f.vx * dt;
          f.z += f.vz * dt;
          f.roll += f.rollV * dt;
          f.yaw += f.yawV * dt;
          if (f.y <= ICE) {
            f.y = ICE;
            if (f.phase === 'fly' && f.vy < -0.6) {
              // A first bounce, then it lies down and skids.
              f.vy *= -0.25;
              f.rollV *= 0.4;
            } else {
              f.vy = 0;
              f.rollTo = nearestFlat(f.roll);
              f.rollV = 0;
              if (f.phase === 'fly') f.phase = 'skid';
              else if (f.phase === 'home') {
                f.vx = f.vz = 0;
                f.yawV = 0;
                // A dab in the snow where it landed.
                if (world.snowAt(f.x, f.z) > 0.15) world.plow(f.x, f.z, f.x, f.z, 0.016 * f.size);
              } else { f.vx = f.vz = 0; f.yawV = 0; }
            }
          }
        }
        if (f.phase === 'skid') {
          const speed = Math.hypot(f.vx, f.vz);
          const snow = world.snowAt(f.x, f.z);
          // Ice is all but frictionless; snow stops a fish in a body length or two.
          const slow = (0.2 + 3.4 * Math.min(1.5, snow)) * dt;
          const k = speed > slow ? (speed - slow) / speed : 0;
          f.vx *= k;
          f.vz *= k;
          f.yawV *= Math.exp(-dt * (1.4 + snow * 4));
          f.yaw += f.yawV * dt;
          f.x += f.vx * dt;
          f.z += f.vz * dt;
          if (snow > 0.12 && speed > 0.02) world.plow(wasX, wasZ, f.x, f.z, 0.02 * f.size);
          if (k === 0 || speed < 0.012) { f.phase = 'rest'; f.t = 0; f.next = 0.3 + Math.random() * 0.4; f.vx = f.vz = 0; }
        }
        if (f.phase !== 'fly' && f.phase !== 'gone') {
          f.roll += (f.rollTo - f.roll) * Math.min(1, dt * 14);
        }
        // The shore: back the way it came, slower.
        if (!world.onIce(f.x, f.z)) {
          f.x = wasX;
          f.z = wasZ;
          f.vx *= -0.4;
          f.vz *= -0.4;
          f.yawV += (Math.random() - 0.5) * 8;
        }
        if (f.phase === 'rest' || f.phase === 'home') {
          f.t += dt;
          f.next -= dt;
          if (f.y <= ICE && f.next <= 0) {
            if (f.phase === 'rest' && f.t > 1.4 + Math.random() * 1.2) f.phase = 'home';
            if (f.phase === 'rest') {
              // A flop where it lies: a little hop, over onto its other side.
              f.vy = 0.28 + Math.random() * 0.12;
              f.vx = (Math.random() - 0.5) * 0.1;
              f.vz = (Math.random() - 0.5) * 0.1;
              f.rollV = (Math.random() < 0.5 ? -1 : 1) * Math.PI / ((2 * f.vy) / GRAVITY);
              f.yawV = (Math.random() - 0.5) * 6;
              f.next = 0.35 + Math.random() * 0.5;
            } else {
              const dx = f.homeX - f.x, dz = f.homeZ - f.z;
              const far = Math.hypot(dx, dz);
              if (far < 0.04) { f.phase = 'gone'; f.fade = 1; }
              else {
                // A hop home, flipping over on the way.
                f.vy = 0.3;
                const air = (2 * f.vy) / GRAVITY;
                const hop = Math.min(0.075, far);
                f.vx = (dx / far) * hop / air;
                f.vz = (dz / far) * hop / air;
                f.rollV = Math.PI / air;
                const want = -Math.atan2(dz, dx);
                f.yawV = (Math.atan2(Math.sin(want - f.yaw), Math.cos(want - f.yaw))) / air;
                f.next = 0.12 + Math.random() * 0.12;
              }
            }
          }
        }
        if (f.phase === 'gone') {
          // Back down the hole.
          f.fade -= dt * 4;
          f.x += (f.homeX - f.x) * Math.min(1, dt * 8);
          f.z += (f.homeZ - f.z) * Math.min(1, dt * 8);
        }
      }

      // Knocks: fish off fish, and fish off shanties. Equal masses, a little give.
      const live = all.filter((f) => f.phase === 'skid' || (f.phase === 'rest' && f.y <= ICE));
      for (let i = 0; i < live.length; i++) {
        const a = live[i]!;
        for (let j = i + 1; j < live.length; j++) {
          const b = live[j]!;
          const dx = b.x - a.x, dz = b.z - a.z;
          const d = Math.hypot(dx, dz);
          const reach = 0.024 * (a.size + b.size);
          if (d >= reach || d < 1e-6) continue;
          const nx = dx / d, nz = dz / d;
          const overlap = (reach - d) / 2;
          a.x -= nx * overlap; a.z -= nz * overlap;
          b.x += nx * overlap; b.z += nz * overlap;
          const closing = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
          if (closing <= 0) continue;
          const j2 = closing * 0.9;
          a.vx -= nx * j2; a.vz -= nz * j2;
          b.vx += nx * j2; b.vz += nz * j2;
          a.yawV += (Math.random() - 0.5) * 10 * closing;
          b.yawV += (Math.random() - 0.5) * 10 * closing;
          for (const f of [a, b]) if (f.phase === 'rest' && Math.hypot(f.vx, f.vz) > 0.02) f.phase = 'skid';
        }
        for (const s of world.shanties) {
          const dx = a.x - s.x, dz = a.z - s.z;
          const d = Math.hypot(dx, dz);
          if (d >= SHANTY || d < 1e-6 || a.phase !== 'skid') continue;
          const nx = dx / d, nz = dz / d;
          a.x = s.x + nx * SHANTY;
          a.z = s.z + nz * SHANTY;
          const into = a.vx * nx + a.vz * nz;
          if (into < 0) { a.vx -= 1.6 * into * nx; a.vz -= 1.6 * into * nz; a.yawV += (Math.random() - 0.5) * 12; }
        }
      }

      for (let i = all.length - 1; i >= 0; i--) {
        const f = all[i]!;
        if (f.phase === 'gone' && f.fade <= 0) { drop(f); all.splice(i, 1); continue; }
        const s = f.size * (f.phase === 'gone' ? Math.max(0, f.fade) : 1);
        f.g.scale.setScalar(s);
        f.g.position.set(f.x, f.y + 0.004, f.z);
        // Lying on its side, which way up it lies being the roll.
        f.g.rotation.set(f.roll, f.yaw, 0, 'YXZ');
      }
    },
    clear() {
      for (const f of all) drop(f);
      all.length = 0;
    },
  };
}
