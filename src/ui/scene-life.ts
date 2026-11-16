// The small things that make the model feel lived in: a flag and chimney
// smoke that lean with the real wind, wakes behind the boats, shadows under
// whatever is flying, a freight train on the causeway, market tents on the
// square, a full stadium, lights for the holidays, and now and then the
// northern lights. Each is switched by the day's real conditions, passed in
// through SkyInput. Nothing here draws a person: crowds are dots.
//
// Built once by the diorama, which hands over what it already knows (where
// the houses are, which road crosses the water, the boats) and calls `tick`
// each frame.

import * as THREE from 'three';
import type { CityShape } from '../core/types';
import type { Glow, GlowSpot, SkyInput } from './scene';

export interface LifeContext {
  scene: THREE.Scene;
  shape: CityShape;
  rand: () => number;
  /** Reduced motion: things hold still. */
  calm: boolean;
  glowPoints: (spots: GlowSpot[], opt: { attenuate: boolean; twinkle: number; speed: number; sharp: number; blend?: 'add' | 'normal' }) => Glow;
  /** Half the width of the lawn at the center, and how tall the building on it stands. */
  lawn: number;
  centerHeight: number;
  /** Where houses stand, in scene coordinates. */
  chimneys: { x: number; z: number }[];
  /** The road that crosses open water, as [east, north, …]: the train runs beside it. */
  rail: number[] | null;
  wet: (east: number, north: number, pad?: number) => boolean;
  boats: { g: THREE.Group; hull: THREE.Mesh }[];
  /** Things in the air that should throw a shadow. */
  fliers: THREE.Object3D[];
  /** The stadium's footprint, as the diorama scaled it: miles east-west and north-south before its turn. */
  stadiumFoot: readonly [number, number];
}

export interface LifeFrame {
  dt: number;
  clock: number;
  /** 0 by day … 1 at night: how lit the windows are. */
  glow: number;
  /** -1 deep night … 1 high noon. */
  e: number;
  wet: number;
  camera: THREE.Camera;
}

export interface Life {
  set(sky: SkyInput): void;
  tick(f: LifeFrame): void;
  /** Where the wind is blowing to (a unit vector in the scene's x and z) and how hard, eased. */
  wind: { x: number; z: number; mph: number };
  /** Point clouds whose size depends on the canvas, for the diorama's resize. */
  points: Glow[];
}

const flat = (color: string, extra: THREE.MeshLambertMaterialParameters = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });

export function addLife(ctx: LifeContext): Life {
  const { scene, shape, rand, calm } = ctx;
  const pick = <T,>(list: T[]): T => list[Math.floor(rand() * list.length)]!;
  const points: Glow[] = [];
  const wind = { x: 1, z: 0, mph: 6 };
  let want = { x: 1, z: 0, mph: 6 };
  let sky: SkyInput | null = null;
  const toward = (now: number, goal: number, k: number) => now + (goal - now) * k;
  // Eased switches, so nothing pops in.
  const on = { smoke: 0, market: 0, game: 0, arena: 0, holiday: 0, aurora: 0, shelf: 0 };
  const turn = shape.gridTurn;
  const spin = (x: number, z: number, a: number): [number, number] => [x * Math.cos(a) + z * Math.sin(a), -x * Math.sin(a) + z * Math.cos(a)];

  // ---------------------------------------------------------------- a flag on the square

  const flag = new THREE.Group();
  {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.003, 0.2, 5), flat('#d8d8d2'));
    pole.position.y = 0.1;
    const c = document.createElement('canvas');
    c.width = 48;
    c.height = 28;
    const x = c.getContext('2d')!;
    for (let i = 0; i < 7; i++) {
      x.fillStyle = i % 2 ? '#f4f1ea' : '#c2262e';
      x.fillRect(0, i * 4, 48, 4);
    }
    x.fillStyle = '#27407a';
    x.fillRect(0, 0, 20, 16);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(0.075, 0.042, 6, 1);
    geo.translate(0.0375, 0, 0); // hinge at the pole
    const cloth = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
    cloth.position.y = 0.176;
    cloth.name = 'cloth';
    flag.add(pole, cloth);
    const [fx, fz] = spin(ctx.lawn * 0.86, ctx.lawn * 0.86, turn);
    flag.position.set(fx, 0.02, fz);
    scene.add(flag);
  }
  const cloth = flag.getObjectByName('cloth') as THREE.Mesh;
  const clothBase = (cloth.geometry.attributes.position!.array as Float32Array).slice();

  // ---------------------------------------------------------------- chimney smoke, when it's cold

  const PUFFS = 5;
  const stacks = ctx.chimneys.filter((c) => Math.hypot(c.x, c.z) < 3).sort(() => rand() - 0.5).slice(0, 44);
  const smoke = ctx.glowPoints(stacks.flatMap((s) => Array.from({ length: PUFFS }, () => ({ x: s.x, y: 0.06, z: s.z, color: '#f3f4f5', size: 0.05 }))), { attenuate: true, twinkle: 0, speed: 0, sharp: 1, blend: 'normal' });
  scene.add(smoke.points);
  points.push(smoke);

  // ---------------------------------------------------------------- wakes behind the boats

  // Painted, not modelled: two soft lines opening behind the stern and fading out.
  const wakeTex = (() => {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 128;
    const x = c.getContext('2d')!;
    const fadeOut = x.createLinearGradient(0, 0, 0, 128);
    fadeOut.addColorStop(0, 'rgba(255,255,255,0.9)');
    fadeOut.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    fadeOut.addColorStop(1, 'rgba(255,255,255,0)');
    x.strokeStyle = fadeOut;
    x.lineCap = 'round';
    x.filter = 'blur(2px)';
    x.lineWidth = 5;
    for (const side of [-1, 1]) {
      x.beginPath();
      x.moveTo(32 + side * 3, 4);
      x.quadraticCurveTo(32 + side * 14, 50, 32 + side * 27, 124);
      x.stroke();
    }
    return new THREE.CanvasTexture(c);
  })();
  const wakeMat = new THREE.MeshBasicMaterial({ map: wakeTex, transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const wakeGeo = new THREE.PlaneGeometry(0.2, 0.42);
  wakeGeo.rotateX(Math.PI / 2); // flat on the water, the bright end toward +z
  wakeGeo.translate(0, 0, -0.29); // which sits just behind the stern (the hull points down +z)
  const wakes = ctx.boats.map((b) => {
    const m = new THREE.Mesh(wakeGeo, wakeMat);
    m.position.y = 0.008;
    b.g.add(m);
    return { m, hull: b.hull };
  });

  // ---------------------------------------------------------------- shadows under whatever is flying

  const shadeMat = new THREE.MeshBasicMaterial({ color: '#0e1a14', transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  const shades = ctx.fliers.map((of) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.16, 14), shadeMat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.03;
    scene.add(m);
    return { m, of };
  });

  // ---------------------------------------------------------------- a freight train beside the causeway

  const CARS = 11;
  const train: THREE.Mesh[] = [];
  const track = (() => {
    if (!ctx.rail || ctx.rail.length < 8) return null;
    // Offset to one side of the road, in scene coordinates, with running length along it.
    const xs: number[] = [];
    const zs: number[] = [];
    const pts = ctx.rail;
    for (let i = 0; i + 1 < pts.length; i += 2) {
      const a = Math.max(0, i - 2);
      const b = Math.min(pts.length - 2, i + 2);
      const dx = pts[b]! - pts[a]!;
      const dz = -(pts[b + 1]! - pts[a + 1]!);
      const l = Math.hypot(dx, dz) || 1;
      xs.push(pts[i]! + (-dz / l) * 0.036);
      zs.push(-pts[i + 1]! + (dx / l) * 0.036);
    }
    const cum = [0];
    for (let i = 1; i < xs.length; i++) cum.push(cum[i - 1]! + Math.hypot(xs[i]! - xs[i - 1]!, zs[i]! - zs[i - 1]!));
    return { xs, zs, cum, len: cum[cum.length - 1]! };
  })();
  if (track) {
    const paints = ['#7b3b2c', '#4c5a66', '#8a6a3a', '#3f5b4a', '#6b4a3a', '#55606b'];
    for (let i = 0; i < CARS; i++) {
      const loco = i === 0;
      const car = new THREE.Mesh(new THREE.BoxGeometry(0.02, loco ? 0.024 : 0.019, 0.058), flat(loco ? '#d9a521' : pick(paints), loco ? { emissive: '#ffcf70', emissiveIntensity: 0 } : {}));
      car.visible = false;
      train.push(car);
      scene.add(car);
    }
  }
  const along = (d: number, out: THREE.Object3D): boolean => {
    if (!track || d <= 0 || d >= track.len) return false;
    let k = 1;
    while (k < track.cum.length - 1 && track.cum[k]! < d) k++;
    const f = (d - track.cum[k - 1]!) / Math.max(1e-6, track.cum[k]! - track.cum[k - 1]!);
    const x = track.xs[k - 1]! + (track.xs[k]! - track.xs[k - 1]!) * f;
    const z = track.zs[k - 1]! + (track.zs[k]! - track.zs[k - 1]!) * f;
    out.position.set(x, ctx.wet(x, -z, 0.02) ? 0.036 : 0.03, z);
    // It comes into view and leaves it by growing from nothing, not by popping.
    out.scale.setScalar(Math.min(1, d / 0.1, (track.len - d) / 0.1));
    out.rotation.y = Math.atan2(track.xs[k]! - track.xs[k - 1]!, track.zs[k]! - track.zs[k - 1]!);
    return true;
  };

  // ---------------------------------------------------------------- market morning on the square

  const market = new THREE.Group();
  const stallRing = ctx.lawn + 0.034;
  const walkRing = ctx.lawn + 0.072;
  /** A point `t` (0..1) of the way round a square of half-width `h`, counter-clockwise seen from above. */
  const round = (t: number, h: number): [number, number] => {
    const s = (((t % 1) + 1) % 1) * 4;
    const k = (s % 1) * 2 - 1;
    const side = Math.floor(s);
    const [x, z] = side === 0 ? [h, -k * h] : side === 1 ? [-k * h, -h] : side === 2 ? [-h, k * h] : [k * h, h];
    return spin(x, z, turn);
  };
  {
    const STALLS = 48;
    const awnings = new THREE.InstancedMesh(new THREE.ConeGeometry(0.02, 0.016, 4), flat('#ffffff'), STALLS);
    const legs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.024, 0.014, 0.024), flat('#e9e4d8'), STALLS);
    const d = new THREE.Object3D();
    const c = new THREE.Color();
    for (let i = 0; i < STALLS; i++) {
      const [x, z] = round((i + 0.5) / STALLS, stallRing);
      d.position.set(x, 0.042, z);
      d.rotation.set(0, turn + Math.PI / 4, 0);
      d.updateMatrix();
      awnings.setMatrixAt(i, d.matrix);
      awnings.setColorAt(i, c.set(rand() < 0.72 ? '#fbfaf5' : pick(['#3f8a5a', '#d9483b', '#f0c33c', '#3d6fa8'])));
      d.position.y = 0.027;
      d.rotation.y = turn;
      d.updateMatrix();
      legs.setMatrixAt(i, d.matrix);
    }
    market.add(awnings, legs);
    market.visible = false;
    scene.add(market);
  }
  // The crowd, as dots, going round the way everyone does.
  const SHOPPERS = 90;
  const shoppers = Array.from({ length: SHOPPERS }, () => ({ t: rand(), lane: (rand() - 0.5) * 0.022, pace: 0.006 + rand() * 0.006 }));
  const crowd = ctx.glowPoints(shoppers.map(() => ({ x: 0, y: 0.03, z: 0, color: pick(['#2f4858', '#b6452c', '#e8e2d2', '#3e6b4f', '#d9a441', '#6b4a6e', '#f4f1ea']), size: 0.024 })), { attenuate: true, twinkle: 0, speed: 0, sharp: 1, blend: 'normal' });
  scene.add(crowd.points);
  points.push(crowd);

  // ---------------------------------------------------------------- game day

  const stadium = shape.landmarks.find((m) => m.kind === 'stadium');
  const arena = shape.landmarks.find((m) => m.kind === 'arena');
  const place = (m: { east: number; north: number; turn?: number }, x: number, z: number): [number, number] => {
    const [rx, rz] = spin(x, z, m.turn ?? 0);
    return [m.east + rx, -m.north + rz];
  };
  // The stands, full: red and white, with a camera flash here and there after dark.
  const fans: GlowSpot[] = [];
  const flashes: GlowSpot[] = [];
  const floods: GlowSpot[] = [];
  const masts = new THREE.Group();
  const marchers: { from: [number, number]; to: [number, number]; t: number; pace: number }[] = [];
  if (stadium) {
    const [sx, sz] = [ctx.stadiumFoot[0] / 0.17, ctx.stadiumFoot[1] / 0.17];
    for (let i = 0; i < 900; i++) {
      const a = rand() * Math.PI * 2;
      const t = 0.12 + rand() * 0.84;
      const r = 0.122 + 0.046 * t;
      const [x, z] = place(stadium, Math.cos(a) * r * sx, Math.sin(a) * r * sz);
      const spot = { x, y: 0.008 + 0.075 * t, z, color: rand() < 0.68 ? '#c5050c' : '#f6f3ee', size: 0.011 };
      fans.push(spot);
      if (i % 22 === 0) flashes.push({ ...spot, y: spot.y + 0.004, color: '#ffffff', size: 0.03 });
    }
    const mastMat = flat('#8d9296');
    for (const [qx, qz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
      const [x, z] = place(stadium, qx * 0.15 * sx, qz * 0.15 * sz);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.004, 0.2, 5), mastMat);
      mast.position.set(x, 0.1, z);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.008), mastMat);
      head.position.set(x, 0.2, z);
      head.lookAt(stadium.east, 0.12, -stadium.north);
      masts.add(mast, head);
      floods.push({ x, y: 0.205, z, color: '#fff6e0', size: 0.06 });
    }
    scene.add(masts);
    // People walking in from four sides, as a thin stream of red.
    for (let side = 0; side < 4; side++) {
      const a = turn + (side * Math.PI) / 2;
      const from = place(stadium, Math.cos(a) * 0.75, Math.sin(a) * 0.75);
      const to = place(stadium, Math.cos(a) * 0.2, Math.sin(a) * 0.2);
      for (let i = 0; i < 16; i++) marchers.push({ from, to, t: rand(), pace: 0.02 + rand() * 0.012 });
    }
  }
  const stands = ctx.glowPoints(fans, { attenuate: true, twinkle: 0, speed: 0, sharp: 1, blend: 'normal' });
  const sparkle = ctx.glowPoints(flashes, { attenuate: true, twinkle: 1, speed: 5.5, sharp: 28 });
  const lamps = ctx.glowPoints(floods, { attenuate: true, twinkle: 0.08, speed: 3, sharp: 1 });
  const march = ctx.glowPoints(marchers.map(() => ({ x: 0, y: 0.03, z: 0, color: rand() < 0.75 ? '#c5050c' : '#f6f3ee', size: 0.014 })), { attenuate: true, twinkle: 0, speed: 0, sharp: 1, blend: 'normal' });
  // The arena, when something's on inside: its roof glows.
  const hall = ctx.glowPoints(arena ? [{ x: arena.east, y: 0.1, z: -arena.north, color: '#ffd9a0', size: 0.3 }, { x: arena.east, y: 0.09, z: -arena.north, color: '#fff1d0', size: 0.12 }] : [], { attenuate: true, twinkle: 0.1, speed: 1.5, sharp: 1 });
  for (const p of [stands, sparkle, lamps, march, hall]) {
    scene.add(p.points);
    points.push(p);
  }

  // ---------------------------------------------------------------- the dome after dark, and the holidays

  const halo = ctx.glowPoints([{ x: 0, y: ctx.centerHeight * 0.7, z: 0, color: '#ffe2ae', size: 0.42 }, { x: 0, y: ctx.centerHeight * 0.98, z: 0, color: '#fff3d6', size: 0.12 }], { attenuate: true, twinkle: 0, speed: 0, sharp: 1 });
  const festive: GlowSpot[] = [];
  const COLORS = ['#ff4d4d', '#58e07a', '#ffd24d', '#5aa8ff', '#fff4dc', '#ff8ad0'];
  for (let i = 0; i < 132; i++) {
    const [x, z] = round(i / 132, ctx.lawn + 0.012 + (i % 2) * 0.03);
    festive.push({ x, y: 0.045 + (i % 3) * 0.012, z, color: COLORS[i % COLORS.length]!, size: 0.03 });
  }
  for (const spot of shape.holidayLights ?? []) {
    for (let i = 0; i < 70; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * spot.radius;
      const x = spot.east + Math.cos(a) * r;
      const z = -spot.north + Math.sin(a) * r;
      if (ctx.wet(x, -z, 0.01)) continue;
      festive.push({ x, y: 0.03 + rand() * 0.07, z, color: pick(COLORS), size: 0.034 });
    }
  }
  const lights = ctx.glowPoints(festive, { attenuate: true, twinkle: 0.7, speed: 2.4, sharp: 2 });
  for (const p of [halo, lights]) {
    scene.add(p.points);
    points.push(p);
  }

  // ---------------------------------------------------------------- the northern lights

  const auroraUniforms = { time: { value: 0 }, power: { value: 0 } };
  const aurora = new THREE.Mesh(
    new THREE.CylinderGeometry(88, 88, 46, 48, 1, true, Math.PI * 0.62, Math.PI * 0.76),
    new THREE.ShaderMaterial({
      uniforms: auroraUniforms, side: THREE.BackSide, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float time; uniform float power; varying vec2 vUv;
        void main(){
          float x = vUv.x * 26.0;
          // Curtains: slow folds, with fine rays inside them that shiver.
          float fold = 0.5 + 0.5 * sin(x * 0.9 + sin(x * 0.37 + time * 0.11) * 2.6 + time * 0.07);
          float rays = 0.62 + 0.38 * sin(x * 9.0 + sin(time * 0.5 + x) * 1.5);
          float hem = 0.2 + 0.1 * sin(x * 0.6 + time * 0.09);
          float rise = smoothstep(hem - 0.06, hem + 0.02, vUv.y) * (1.0 - smoothstep(hem + 0.02, hem + 0.42 + 0.2 * fold, vUv.y));
          float edge = smoothstep(0.0, 0.14, vUv.x) * smoothstep(1.0, 0.86, vUv.x);
          vec3 green = vec3(0.25, 1.0, 0.55);
          vec3 violet = vec3(0.62, 0.3, 0.9);
          vec3 c = mix(green, violet, smoothstep(hem + 0.1, hem + 0.5, vUv.y));
          gl_FragColor = vec4(c * rise * (0.25 + 0.75 * fold) * rays * edge * power, 1.0);
        }`,
    }),
  );
  aurora.frustumCulled = false;
  aurora.visible = false;
  scene.add(aurora);

  // ---------------------------------------------------------------- a shelf cloud, ahead of a storm warning

  const shelf = new THREE.Group();
  const shelfMat = new THREE.MeshLambertMaterial({ color: '#39414b', flatShading: true, transparent: true, opacity: 0 });
  for (let i = 0; i < 26; i++) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + rand() * 0.7, 1), shelfMat);
    puff.position.set((rand() - 0.5) * 1.6, rand() * 0.5, -13 + i * 1.0 + rand() * 0.5);
    puff.scale.set(1.5, 0.42, 1.2);
    shelf.add(puff);
  }
  shelf.position.set(-7.5, 2.5, 0);
  shelf.visible = false;
  scene.add(shelf);

  // ---------------------------------------------------------------- each frame

  let trainAt = -2;
  let smokeOnSnow = false; // seconds into its run; negative while it waits out of sight
  const TRAIN_SPEED = 0.11;
  const GAP = 0.066;

  return {
    wind,
    points,
    set(next) {
      sky = next;
      const from = ((next.windFrom ?? 270) * Math.PI) / 180;
      // Meteorologists name the wind for where it comes from; the scene wants where it's going.
      want = { x: -Math.sin(from), z: Math.cos(from), mph: next.windMph ?? 6 };
      // The lights go up once and stay up; the tents only need building once too.
      market.visible = Boolean(next.market);
      // White smoke vanishes against snow, so over snow it is drawn a cool grey.
      const snowy = next.snowIn >= 1 || (next.snowing && next.wet > 0.6);
      if (snowy !== smokeOnSnow) {
        smokeOnSnow = snowy;
        const c = new THREE.Color(snowy ? '#b4bcc5' : '#f3f4f5');
        const tint = smoke.geo.attributes.tint!;
        for (let i = 0; i < tint.count; i++) tint.setXYZ(i, c.r, c.g, c.b);
        tint.needsUpdate = true;
      }
    },
    tick({ dt, clock, glow, e, wet: wetNow, camera }) {
      const k = calm ? 1 : 1 - Math.exp(-dt * 1.2);
      wind.x = toward(wind.x, want.x, k);
      wind.z = toward(wind.z, want.z, k);
      wind.mph = toward(wind.mph, want.mph, k);
      const day = Math.min(1, Math.max(0, e * 2.5 + 0.15));
      const blow = Math.min(1, wind.mph / 22);
      const cold = sky?.tempF !== undefined && sky.tempF <= 32;
      on.smoke = toward(on.smoke, cold ? 1 : 0, k);
      on.market = toward(on.market, sky?.market ? 1 : 0, k);
      on.game = toward(on.game, sky?.busy?.includes(stadium?.name ?? '') ? 1 : 0, k);
      on.arena = toward(on.arena, sky?.busy?.includes(arena?.name ?? '') ? 1 : 0, k);
      on.holiday = toward(on.holiday, sky?.holiday ? 1 : 0, k);
      on.aurora = toward(on.aurora, sky?.aurora ? 1 : 0, k);
      on.shelf = toward(on.shelf, sky?.shelf ? 1 : 0, k);

      // The flag swings to the wind, ripples harder the more it blows, and hangs when it doesn't.
      flag.rotation.y = Math.atan2(-wind.z, wind.x);
      const pos = cloth.geometry.attributes.position!;
      const limp = 1 - Math.min(1, wind.mph / 5);
      for (let i = 0; i < pos.count; i++) {
        const bx = clothBase[i * 3]!;
        const by = clothBase[i * 3 + 1]!;
        const far = bx / 0.075;
        pos.setZ(i, calm ? 0 : Math.sin(clock * (5 + blow * 9) - far * 5) * 0.006 * far * (0.4 + blow));
        pos.setX(i, bx * (1 - limp * 0.55));
        pos.setY(i, by - limp * far * 0.045);
      }
      pos.needsUpdate = true;

      // Smoke: each puff climbs, drifts downwind, swells and thins.
      smoke.points.visible = on.smoke > 0.02;
      if (smoke.points.visible) {
        const lean = 0.05 + wind.mph * 0.012;
        const rise = 0.34 / (1 + blow * 1.6);
        stacks.forEach((s, si) => {
          for (let p = 0; p < PUFFS; p++) {
            const i = si * PUFFS + p;
            const a = calm ? p / PUFFS : (clock * 0.16 + p / PUFFS + si * 0.37) % 1;
            smoke.pos[i * 3] = s.x + wind.x * lean * a * a + Math.sin(si + a * 5) * 0.006;
            smoke.pos[i * 3 + 1] = 0.058 + rise * a;
            smoke.pos[i * 3 + 2] = s.z + wind.z * lean * a * a;
            smoke.size[i] = 0.04 + a * 0.12;
            smoke.fade[i] = Math.sin(Math.min(1, a * 6) * Math.PI * 0.5) * (1 - a * a);
          }
        });
        for (const name of ['position', 'size', 'fade']) smoke.geo.attributes[name]!.needsUpdate = true;
        smoke.uniforms.opacity.value = on.smoke * (0.4 + 0.5 * Math.max(day, 0.25));
      }

      // Wakes follow their boats; gone on ice, faint at night.
      wakeMat.opacity = 0.08 + 0.42 * day;
      for (const w of wakes) w.m.visible = w.hull.visible && !calm;

      // Shadows: only when there's a sun to throw them.
      shadeMat.opacity = 0.2 * Math.max(0, Math.min(1, e * 3)) * (1 - wetNow);
      for (const s of shades) {
        const h = s.of.position.y;
        s.m.visible = s.of.visible && shadeMat.opacity > 0.01 && h > 0.12;
        s.m.position.x = s.of.position.x - h * 0.25;
        s.m.position.z = s.of.position.z + h * 0.12;
        const size = 0.7 + Math.min(1.6, h * 0.5);
        s.m.scale.set(size, size, 1);
      }

      // The train: across, then gone for a while.
      if (track) {
        const run = (track.len + CARS * GAP) / TRAIN_SPEED;
        trainAt += dt * (calm ? 0 : 1);
        if (trainAt > run) trainAt = -(35 + Math.random() * 40);
        train.forEach((car, i) => {
          car.visible = along(trainAt * TRAIN_SPEED - i * GAP, car);
        });
        (train[0]!.material as THREE.MeshLambertMaterial).emissiveIntensity = glow * 0.9;
      }

      // Market: the tents are there or not; the crowd shuffles round counter-clockwise.
      crowd.points.visible = on.market > 0.02;
      if (crowd.points.visible) {
        shoppers.forEach((s, i) => {
          s.t += s.pace * dt * (calm ? 0 : 1);
          const [x, z] = round(s.t, walkRing + s.lane);
          crowd.pos[i * 3] = x;
          crowd.pos[i * 3 + 2] = z;
        });
        crowd.geo.attributes.position!.needsUpdate = true;
        crowd.uniforms.opacity.value = on.market * (0.45 + 0.55 * day);
      }

      // Game day: full stands, floodlights, a stream of red walking in.
      const game = on.game;
      stands.points.visible = masts.visible = march.points.visible = lamps.points.visible = sparkle.points.visible = game > 0.02;
      if (game > 0.02) {
        stands.uniforms.opacity.value = game * (0.5 + 0.5 * Math.max(day, glow * 0.8));
        lamps.uniforms.opacity.value = game * (0.3 + 0.4 * glow);
        sparkle.uniforms.opacity.value = game * glow;
        marchers.forEach((m, i) => {
          m.t = (m.t + m.pace * dt * (calm ? 0 : 1)) % 1;
          march.pos[i * 3] = m.from[0] + (m.to[0] - m.from[0]) * m.t + Math.sin(i * 12.9898) * 0.012;
          march.pos[i * 3 + 2] = m.from[1] + (m.to[1] - m.from[1]) * m.t + Math.sin(i * 78.233) * 0.012;
          march.fade[i] = Math.min(1, m.t * 6, (1 - m.t) * 6);
        });
        march.geo.attributes.position!.needsUpdate = true;
        march.geo.attributes.fade!.needsUpdate = true;
        march.uniforms.opacity.value = game * (0.45 + 0.55 * day);
      }
      hall.points.visible = on.arena > 0.02;
      hall.uniforms.opacity.value = on.arena * (0.06 + 0.24 * glow);

      // The dome is lit every night; the coloured lights only around the holidays.
      halo.uniforms.opacity.value = glow * 0.2 * (1 - wetNow * 0.4);
      lights.points.visible = on.holiday > 0.02;
      lights.uniforms.opacity.value = on.holiday * (0.12 + 0.6 * glow);

      // Northern lights: low in the north, after dark, when the sky is open.
      const night = Math.max(0, Math.min(1, -e * 2.5));
      auroraUniforms.power.value = on.aurora * night * (1 - wetNow) * 0.85;
      aurora.visible = auroraUniforms.power.value > 0.01;
      auroraUniforms.time.value = calm ? 0 : clock;
      aurora.position.set(camera.position.x, 14, camera.position.z);

      // The shelf cloud hangs in the west and creeps.
      shelfMat.opacity = on.shelf * 0.94;
      shelf.visible = on.shelf > 0.02;
      shelfMat.color.set('#39414b').multiplyScalar(0.35 + 0.65 * Math.max(day, 0.2));
      shelf.position.x = -7.5 + (calm ? 0 : Math.sin(clock * 0.05) * 0.5) + on.shelf * 1.5;

      for (const p of points) p.uniforms.time.value = clock;
    },
  };
}
