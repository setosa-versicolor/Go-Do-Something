// The diorama: a small low-poly Madison under the real sky. The Capitol sits
// at the origin on the isthmus; one unit is one mile, +x is east, -z is north,
// so a place's latitude and longitude drop straight onto the model.
//
// Everything here is decoration except three things that talk back to the app:
// tapping a beacon (a pick), tapping the balloon ("surprise me"), and the
// first interaction (to retire the hint). Loaded lazily; if WebGL isn't there
// the page simply keeps its painted sky.

import * as THREE from 'three';

export interface SkyInput {
  time: number;
  sunrise: number;
  sunset: number;
  /** 0 clear … 1 pouring. */
  wet: number;
  snowing: boolean;
  /** Snow on the ground, inches. */
  snowIn: number;
  /** Cold enough, late enough in the year, for ice. */
  frozen: boolean;
  /** 1-12, for the color of the trees. */
  month: number;
}

export interface Pin {
  /** Miles east and north of the city center. */
  east: number;
  north: number;
  color: string;
}

export type Pose = 'mood' | 'time' | 'thinking' | 'results';

export interface Diorama {
  setSky(input: SkyInput): void;
  setPose(pose: Pose): void;
  setPins(pins: Pin[]): void;
  focus(index: number | null): void;
  dispose(): void;
}

interface Callbacks {
  onPin(index: number): void;
  onBalloon(): void;
  onTouch(): void;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// ---------------------------------------------------------------- the sky, as numbers

interface Look {
  top: THREE.Color;
  horizon: THREE.Color;
  light: THREE.Color;
  sun: number; // directional intensity
  ambient: number;
  stars: number;
  glow: number; // lit windows
}

const KEYS: [number, string, string, string, number, number, number, number][] = [
  // elevation, top, horizon, light, sun, ambient, stars, glow
  [-1.0, '#050919', '#18214e', '#8fa3ff', 0.25, 0.5, 1, 1],
  [-0.35, '#121844', '#5d3a70', '#b9a4e8', 0.4, 0.55, 0.6, 1],
  [0.0, '#2b4374', '#f08a4b', '#ffab6b', 1.1, 0.7, 0.1, 0.7],
  [0.25, '#4a82c4', '#f7cf95', '#ffe2b5', 1.7, 0.9, 0, 0.1],
  [0.6, '#3d8dd8', '#cfe6f2', '#ffffff', 2.1, 1.1, 0, 0],
];

/** -1 (deep night) … 0 (horizon) … 1 (high noon), plus progress across the daylight arc. */
export function elevation(time: number, sunrise: number, sunset: number): { e: number; p: number } {
  const t = sunrise + ((((time - sunrise) % DAY) + DAY) % DAY);
  if (t <= sunset) {
    const p = (t - sunrise) / (sunset - sunrise);
    return { e: Math.sin(Math.PI * p), p };
  }
  const sinceSet = t - sunset;
  const untilRise = sunrise + DAY - t;
  return { e: -Math.min(1, Math.min(sinceSet, untilRise) / (1.5 * HOUR)), p: sinceSet < untilRise ? 1 : 0 };
}

function lookAt(e: number, wet: number): Look {
  let i = 0;
  while (i < KEYS.length - 2 && e > KEYS[i + 1]![0]) i++;
  const a = KEYS[i]!;
  const b = KEYS[i + 1]!;
  const k = Math.min(1, Math.max(0, (e - a[0]) / (b[0] - a[0])));
  const mix = (x: string, y: string) => new THREE.Color(x).lerp(new THREE.Color(y), k);
  const num = (x: number, y: number) => x + (y - x) * k;
  const look: Look = {
    top: mix(a[1], b[1]), horizon: mix(a[2], b[2]), light: mix(a[3], b[3]),
    sun: num(a[4], b[4]), ambient: num(a[5], b[5]), stars: num(a[6], b[6]), glow: num(a[7], b[7]),
  };
  if (wet > 0) {
    // Overcast: the color drains out and the light flattens.
    const grey = new THREE.Color(e > 0 ? '#9aa3aa' : '#1c2030');
    look.top.lerp(grey, wet * 0.75);
    look.horizon.lerp(grey.clone().multiplyScalar(1.15), wet * 0.75);
    look.sun *= 1 - wet * 0.55;
    look.stars *= 1 - wet;
  }
  return look;
}

// ---------------------------------------------------------------- the land

interface Lake {
  east: number;
  north: number;
  rx: number;
  rz: number;
  turn: number;
}

// Rough outlines, in miles from the Capitol. Mendota to the north-west,
// Monona to the south-east, little Wingra to the south-west.
const LAKES: Lake[] = [
  { east: -1.9, north: 2.35, rx: 3.0, rz: 1.9, turn: -0.12 },
  { east: 1.0, north: -0.98, rx: 2.0, rz: 0.98, turn: Math.PI / 4 },
  { east: -1.9, north: -1.5, rx: 0.62, rz: 0.26, turn: 0.1 },
];

function inLake(east: number, north: number, pad = 0): boolean {
  return LAKES.some((l) => {
    const dx = east - l.east;
    const dz = north - l.north;
    const c = Math.cos(-l.turn);
    const s = Math.sin(-l.turn);
    const x = dx * c - dz * s;
    const z = dx * s + dz * c;
    return (x / (l.rx + pad)) ** 2 + (z / (l.rz + pad)) ** 2 < 1;
  });
}

/** Deterministic scatter, so the town looks the same on every visit. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const flat = (color: string, extra: THREE.MeshLambertMaterialParameters = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...extra });

// ---------------------------------------------------------------- build

export function createDiorama(canvas: HTMLCanvasElement, cb: Callbacks, calm: boolean): Diorama {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  scene.fog = new THREE.Fog('#cfe6f2', 12, 46);

  const hemi = new THREE.HemisphereLight('#ffffff', '#9a9c86', 1);
  const sunLight = new THREE.DirectionalLight('#ffffff', 2);
  scene.add(hemi, sunLight);

  // Sky dome: a vertical gradient we can repaint every frame.
  const skyUniforms = { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } };
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(90, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyUniforms,
      vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying float h; void main(){ float k = smoothstep(-0.02, 0.4, h); gl_FragColor = vec4(mix(horizon, top, k), 1.0); }',
    }),
  );
  scene.add(dome);

  const rand = seeded(608);

  // Stars.
  const starPos: number[] = [];
  for (let i = 0; i < 260; i++) {
    const u = rand() * Math.PI * 2;
    const v = 0.12 + rand() * 0.85;
    starPos.push(Math.cos(u) * Math.sqrt(1 - v * v) * 80, v * 80, Math.sin(u) * Math.sqrt(1 - v * v) * 80);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  scene.add(stars);

  // Sun and moon. Both tappable: they run the day forward.
  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(2.6, 20, 12), new THREE.MeshBasicMaterial({ color: '#ffe9a8', fog: false }));
  const sunHalo = new THREE.Mesh(new THREE.SphereGeometry(4.6, 20, 12), new THREE.MeshBasicMaterial({ color: '#ffd27a', fog: false, transparent: true, opacity: 0.22, depthWrite: false }));
  sunDisc.add(sunHalo);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1.7, 20, 12), new THREE.MeshBasicMaterial({ color: '#eeeadb', fog: false, transparent: true }));
  moon.position.set(-22, 26, -52);
  scene.add(sunDisc, moon);

  // Land: one big disc that fades into the fog, and a low rise for the Capitol.
  const landMat = flat('#6f9a5b');
  const land = new THREE.Mesh(new THREE.CircleGeometry(60, 48), landMat);
  land.rotation.x = -Math.PI / 2;
  scene.add(land);
  const hill = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.12, 20, 1), landMat);
  hill.position.y = 0.06;
  scene.add(hill);

  // Lakes.
  const waterMat = new THREE.MeshLambertMaterial({ color: '#2f7fae', emissive: '#0d2a40', emissiveIntensity: 0.35 });
  const shoreMat = flat('#d8c9a2');
  const lakes: THREE.Mesh[] = LAKES.map((l) => {
    const shape = new THREE.Shape();
    shape.absellipse(0, 0, l.rx, l.rz, 0, Math.PI * 2, false, 0);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(shape, 40), waterMat);
    m.rotation.set(-Math.PI / 2, 0, l.turn);
    m.position.set(l.east, 0.012, -l.north);
    const rim = new THREE.Mesh(new THREE.ShapeGeometry(shape, 40), shoreMat);
    rim.rotation.copy(m.rotation);
    rim.position.set(l.east, 0.006, -l.north);
    rim.scale.set(1 + 0.07 / l.rx, 1 + 0.07 / l.rz, 1);
    scene.add(rim, m);
    return m;
  });

  // The Capitol: four wings, a drum, a dome, a lantern.
  const marble = new THREE.MeshLambertMaterial({ color: '#f1ece0', flatShading: true, emissive: '#ffe7b8', emissiveIntensity: 0 });
  const capitol = new THREE.Group();
  for (let i = 0; i < 2; i++) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.13), marble);
    wing.position.y = 0.17;
    wing.rotation.y = Math.PI / 4 + (i * Math.PI) / 2;
    capitol.add(wing);
  }
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.2, 14), marble);
  drum.position.y = 0.3;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), marble);
  cap.scale.y = 1.35;
  cap.position.y = 0.4;
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.07, 8), marble);
  lantern.position.y = 0.58;
  const gilt = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshLambertMaterial({ color: '#e7b93e', emissive: '#e7b93e', emissiveIntensity: 0.5 }));
  gilt.position.y = 0.63;
  capitol.add(drum, cap, lantern, gilt);
  scene.add(capitol);

  // Downtown: small blocks along the isthmus, none taller than the dome (it's the law).
  const blockMat = new THREE.MeshLambertMaterial({ color: '#b9ab98', flatShading: true, emissive: '#ffc874', emissiveIntensity: 0 });
  const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), blockMat, 150);
  const dummy = new THREE.Object3D();
  let placed = 0;
  for (let tries = 0; placed < 150 && tries < 4000; tries++) {
    const along = (rand() - 0.5) * 3.4; // south-west to north-east
    const across = (rand() - 0.5) * 0.62;
    const east = along * 0.72 + across * 0.7;
    const north = along * 0.7 - across * 0.72;
    if (Math.hypot(east, north) < 0.42 || inLake(east, north, 0.06)) continue;
    const near = Math.max(0, 1 - Math.hypot(east, north) / 1.7);
    dummy.position.set(east, 0, -north);
    dummy.scale.set(0.07 + rand() * 0.06, 0.05 + rand() * 0.2 * near + 0.03, 0.07 + rand() * 0.06);
    dummy.position.y = dummy.scale.y / 2;
    dummy.rotation.y = Math.PI / 4;
    dummy.updateMatrix();
    blocks.setMatrixAt(placed++, dummy.matrix);
  }
  blocks.count = placed;
  scene.add(blocks);

  // Trees.
  const treeMat = flat('#3f7a48', { emissive: '#1f3a24', emissiveIntensity: 0.6 });
  const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 0.22, 5), treeMat, 520);
  placed = 0;
  for (let tries = 0; placed < 520 && tries < 6000; tries++) {
    const r = 0.5 + rand() ** 0.7 * 9;
    const a = rand() * Math.PI * 2;
    const east = Math.cos(a) * r;
    const north = Math.sin(a) * r;
    if (inLake(east, north, 0.05)) continue;
    const s = 0.7 + rand() * 0.9;
    dummy.position.set(east, 0.11 * s, -north);
    dummy.scale.set(s, s, s);
    dummy.rotation.y = rand() * 3;
    dummy.updateMatrix();
    trees.setMatrixAt(placed++, dummy.matrix);
  }
  trees.count = placed;
  scene.add(trees);

  // Clouds: a few soft clumps that drift, thicker when the forecast says so.
  const cloudMat = new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true, transparent: true, opacity: 0.9 });
  const clouds: THREE.Group[] = [];
  for (let i = 0; i < 9; i++) {
    const g = new THREE.Group();
    for (let j = 0; j < 4; j++) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5 + rand() * 0.5, 0), cloudMat);
      puff.position.set(j * 0.6 - 0.9, rand() * 0.25, rand() * 0.4);
      puff.scale.y = 0.55;
      g.add(puff);
    }
    g.position.set(-14 + rand() * 28, 3.6 + rand() * 1.6, -12 + rand() * 12);
    g.userData.speed = 0.08 + rand() * 0.1;
    clouds.push(g);
    scene.add(g);
  }

  // Sailboats on Mendota (ice shanties when it's frozen).
  const tappable: THREE.Object3D[] = [];
  const hullMat = flat('#f4efe4');
  const sailMat = new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide });
  const shantyMat = flat('#b5543a');
  interface Boat { g: THREE.Group; sail: THREE.Mesh; shanty: THREE.Mesh; hull: THREE.Mesh; angle: number; radius: number; speed: number; spin: number; cx: number; cz: number }
  const boats: Boat[] = [];
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 4), hullMat);
    hull.rotation.set(Math.PI / 2, 0, 0);
    hull.scale.set(1, 1, 0.5);
    hull.position.y = 0.035;
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.05, -0.06, 0, 0.32, -0.02, 0, 0.05, 0.1], 3));
    tri.computeVertexNormals();
    const sail = new THREE.Mesh(tri, sailMat);
    const shanty = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.09), shantyMat);
    shanty.position.y = 0.05;
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.34, 6, 4), new THREE.MeshBasicMaterial({ visible: false }));
    g.add(hull, sail, shanty, hit);
    const lake = i < 3 ? LAKES[0]! : LAKES[1]!;
    const boat: Boat = { g, sail, shanty, hull, angle: rand() * 6, radius: 0.35 + rand() * 0.5, speed: 0.12 + rand() * 0.1, spin: 0, cx: lake.east + (rand() - 0.5) * lake.rx * 0.9, cz: -lake.north + (rand() - 0.5) * lake.rz * 0.5 };
    hit.userData.tap = () => { boat.spin = 1; };
    tappable.push(hit);
    boats.push(boat);
    scene.add(g);
  }

  // The balloon: tap it and you're asking for a surprise.
  const balloon = new THREE.Group();
  const envelope = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), flat('#e2574c', { emissive: '#e2574c', emissiveIntensity: 0.35 }));
  envelope.scale.y = 1.18;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.343, 0.343, 0.12, 12, 1, true), flat('#f6d15a', { emissive: '#f6d15a', emissiveIntensity: 0.35 }));
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.1), flat('#7a5230'));
  basket.position.y = -0.52;
  const balloonHit = new THREE.Mesh(new THREE.SphereGeometry(0.62, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
  balloon.add(envelope, band, basket, balloonHit);
  let lift = 0;
  balloonHit.userData.tap = () => { lift = 1; cb.onBalloon(); };
  tappable.push(balloonHit);
  scene.add(balloon);

  // Birds.
  const birdMat = new THREE.MeshBasicMaterial({ color: '#1d2a33', side: THREE.DoubleSide });
  const flock = new THREE.Group();
  const wings: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const bird = new THREE.Group();
    for (const side of [-1, 1]) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, side * 0.09, 0, -0.03, side * 0.09, 0, 0.03], 3));
      const w = new THREE.Mesh(g, birdMat);
      w.userData.side = side;
      wings.push(w);
      bird.add(w);
    }
    bird.position.set((i % 3) * 0.22 - Math.floor(i / 3) * 0.1, Math.floor(i / 3) * 0.08, Math.floor(i / 3) * 0.25);
    flock.add(bird);
  }
  scene.add(flock);

  // Weather: one cloud of particles reused for rain or snow.
  const drops = 500;
  const dropPos = new Float32Array(drops * 3);
  for (let i = 0; i < drops; i++) {
    dropPos[i * 3] = (rand() - 0.5) * 14;
    dropPos[i * 3 + 1] = rand() * 6;
    dropPos[i * 3 + 2] = (rand() - 0.5) * 14;
  }
  const dropGeo = new THREE.BufferGeometry();
  dropGeo.setAttribute('position', new THREE.BufferAttribute(dropPos, 3));
  const dropMat = new THREE.PointsMaterial({ color: '#dfe8ef', size: 2, sizeAttenuation: false, transparent: true, opacity: 0 });
  const weather = new THREE.Points(dropGeo, dropMat);
  scene.add(weather);

  // Tapping the Capitol throws a little confetti.
  const sparkN = 90;
  const sparkPos = new Float32Array(sparkN * 3);
  const sparkVel = new Float32Array(sparkN * 3);
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparkMat = new THREE.PointsMaterial({ color: '#ffd76a', size: 4, sizeAttenuation: false, transparent: true, opacity: 0, fog: false });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  scene.add(sparks);
  let sparkLife = 0;
  let capitolPulse = 0;
  const capitolHit = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
  capitolHit.position.y = 0.35;
  capitolHit.userData.tap = () => {
    capitolPulse = 1;
    sparkLife = 1;
    for (let i = 0; i < sparkN; i++) {
      sparkPos.set([0, 0.62, 0], i * 3);
      const a = Math.random() * Math.PI * 2;
      const up = 0.9 + Math.random() * 1.4;
      const out = 0.2 + Math.random() * 0.7;
      sparkVel.set([Math.cos(a) * out, up, Math.sin(a) * out], i * 3);
    }
  };
  tappable.push(capitolHit);
  scene.add(capitolHit);

  // Ripples where you touch the water.
  const ripples: { m: THREE.Mesh; life: number }[] = [];
  for (const lake of lakes) {
    lake.userData.tap = (p: THREE.Vector3) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 28), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(p.x, 0.02, p.z);
      scene.add(m);
      ripples.push({ m, life: 1 });
    };
    tappable.push(lake);
  }

  // The sun runs the day forward when tapped.
  let lapse = 0; // hours still to play
  const lapseTap = () => { if (!calm) lapse = 24; };
  sunDisc.userData.tap = lapseTap;
  moon.userData.tap = lapseTap;
  tappable.push(sunDisc, moon);

  // Beacons for the picks.
  interface Beacon { g: THREE.Group; beam: THREE.Mesh; ring: THREE.Mesh; label: THREE.Sprite; pos: THREE.Vector3; born: number }
  let beacons: Beacon[] = [];
  let focused: number | null = null;
  const label = (n: number, color: string) => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d')!;
    x.fillStyle = color;
    x.beginPath();
    x.arc(64, 64, 56, 0, Math.PI * 2);
    x.fill();
    x.lineWidth = 8;
    x.strokeStyle = '#ffffff';
    x.stroke();
    x.fillStyle = '#ffffff';
    x.font = '600 76px Georgia, serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(String(n), 64, 70);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, fog: false, transparent: true }));
  };

  // ------------------------------------------------------------ camera rig

  interface Rig { tx: number; ty: number; tz: number; theta: number; phi: number; r: number }
  const POSES: Record<Pose, Rig> = {
    // The target sits above the town, so the model rides low in the frame and the sky gets the top.
    mood: { tx: -0.4, ty: 1.55, tz: -0.8, theta: 0.72, phi: 1.4, r: 8.6 },
    time: { tx: 0, ty: 0.85, tz: 0, theta: 0.3, phi: 1.4, r: 4.0 },
    thinking: { tx: 0, ty: 1.0, tz: 0, theta: 2.4, phi: 1.1, r: 11 },
    results: { tx: 0, ty: 1.0, tz: 0, theta: 0.5, phi: 0.98, r: 9 },
  };
  let pose: Pose = 'mood';
  let goal: Rig = { ...POSES.mood };
  const rig: Rig = { ...POSES.mood };
  const user = { theta: 0, phi: 0 };

  const fitPins = (): Rig => {
    if (beacons.length === 0) return { ...POSES.results };
    const one = focused === null ? undefined : beacons[focused];
    if (one) {
      const p = one.pos;
      return { tx: p.x, ty: 0.35, tz: p.z, theta: 0.5, phi: 1.2, r: 5 };
    }
    const cx = beacons.reduce((s, b) => s + b.pos.x, 0) / beacons.length;
    const cz = beacons.reduce((s, b) => s + b.pos.z, 0) / beacons.length;
    const spread = Math.max(...beacons.map((b) => Math.hypot(b.pos.x - cx, b.pos.z - cz)));
    return { tx: cx, ty: 0.2, tz: cz, theta: 0.5, phi: 1.12, r: Math.min(26, Math.max(7, 5 + spread * 3.6)) };
  };

  // ------------------------------------------------------------ pointer

  const ray = new THREE.Raycaster();
  let down: { x: number; y: number; moved: boolean } | null = null;
  const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY, moved: false }; };
  const onMove = (e: PointerEvent) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    const dy = e.clientY - down.y;
    if (!down.moved && Math.hypot(dx, dy) < 6) return;
    if (!down.moved) cb.onTouch();
    down.moved = true;
    user.theta -= dx * 0.006;
    user.phi = Math.max(-0.45, Math.min(0.2, user.phi - dy * 0.004));
    down.x = e.clientX;
    down.y = e.clientY;
  };
  const onUp = (e: PointerEvent) => {
    const wasTap = down && !down.moved;
    down = null;
    if (!wasTap) return;
    const box = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - box.left) / box.width) * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1), camera);
    const hit = ray.intersectObjects(tappable, false)[0];
    if (!hit) return;
    cb.onTouch();
    (hit.object.userData.tap as (p: THREE.Vector3) => void)(hit.point);
  };
  const onLeave = () => { down = null; };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onLeave);
  canvas.addEventListener('pointerleave', onLeave);

  // ------------------------------------------------------------ frame loop

  let sky: SkyInput | null = null;
  const look: Look = lookAt(0.6, 0);
  let wetNow = 0;
  let last = performance.now();
  let clock = 0;
  let raf = 0;
  let spinning = 0;

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      // Keep the town in frame on a tall phone and a wide desktop alike.
      camera.fov = w / h < 1 ? 52 : w / h < 1.8 ? 42 : 32;
      camera.updateProjectionMatrix();
    }
  };

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    resize();
    const ease = calm ? 1 : 1 - Math.exp(-dt * 2.4);

    // Sky.
    if (sky) {
      let t = sky.time;
      if (lapse > 0) {
        lapse = Math.max(0, lapse - dt * 6); // a day in four seconds
        t += (24 - lapse) * HOUR;
      }
      const { e, p } = elevation(t, sky.sunrise, sky.sunset);
      wetNow += (sky.wet - wetNow) * ease;
      const want = lookAt(e, wetNow);
      const k = lapse > 0 ? 1 : ease;
      look.top.lerp(want.top, k);
      look.horizon.lerp(want.horizon, k);
      look.light.lerp(want.light, k);
      look.sun += (want.sun - look.sun) * k;
      look.ambient += (want.ambient - look.ambient) * k;
      look.stars += (want.stars - look.stars) * k;
      look.glow += (want.glow - look.glow) * k;

      skyUniforms.top.value.copy(look.top);
      skyUniforms.horizon.value.copy(look.horizon);
      (scene.fog as THREE.Fog).color.copy(look.horizon);
      hemi.intensity = look.ambient * 1.7;
      hemi.color.copy(look.top).lerp(new THREE.Color('#ffffff'), 0.55);
      sunLight.intensity = look.sun;
      sunLight.color.copy(look.light);
      (stars.material as THREE.PointsMaterial).opacity = look.stars;
      blockMat.emissiveIntensity = look.glow * 0.9;
      marble.emissiveIntensity = look.glow * 0.55 + capitolPulse * 1.2;
      cloudMat.color.copy(look.horizon).lerp(new THREE.Color('#ffffff'), e > 0.2 ? 0.75 : 0.25);

      // The sun crosses the far (north-western) sky so it sets where Madison watches it set: over Mendota.
      const up = e > -0.08;
      sunDisc.visible = up;
      const a = Math.PI * p;
      sunDisc.position.set(Math.cos(a) * 46 - 8, Math.sin(a) * 30 + 0.5, -52 + Math.sin(a) * 6);
      // Stylized: the key light always comes over the viewer's shoulder, so the town is never a silhouette.
      sunLight.position.set(Math.cos(a) * 5 + 3, 6 + Math.sin(a) * 3, 6);
      (sunDisc.material as THREE.MeshBasicMaterial).color.copy(new THREE.Color('#ff9a52')).lerp(new THREE.Color('#fff3c4'), Math.min(1, Math.max(0, e * 2.2)));
      (moon.material as THREE.MeshBasicMaterial).opacity = Math.min(1, Math.max(0, -e * 3)) * (1 - wetNow * 0.8);
      moon.visible = e < 0;

      // Weather.
      dropMat.opacity += ((sky.wet > 0.3 ? 0.75 : 0) - dropMat.opacity) * ease;
      if (dropMat.opacity > 0.02) {
        const fall = sky.snowing ? 0.9 : 7;
        for (let i = 0; i < drops; i++) {
          let y = dropPos[i * 3 + 1]! - fall * dt;
          if (sky.snowing) dropPos[i * 3] = dropPos[i * 3]! + Math.sin(clock * 1.3 + i) * dt * 0.25;
          if (y < 0) y = 6;
          dropPos[i * 3 + 1] = y;
        }
        dropGeo.attributes.position!.needsUpdate = true;
        dropMat.size = sky.snowing ? 3 : 1.6;
        weather.position.set(rig.tx, 0, rig.tz);
      }
    }

    // Clouds drift; more of them show when it's grey.
    clouds.forEach((c, i) => {
      c.position.x += (c.userData.speed as number) * dt * (calm ? 0 : 1);
      if (c.position.x > 16) c.position.x = -16;
      c.visible = i < 3 + Math.round(wetNow * 6);
    });
    cloudMat.opacity = 0.55 + wetNow * 0.4;

    // Water breathes.
    waterMat.emissiveIntensity = 0.3 + Math.sin(clock * 0.8) * 0.05;

    // Boats sail lazy circles; a tapped one spins like it caught a gust.
    for (const b of boats) {
      b.angle += b.speed * dt * (1 + b.spin * 5) * (calm ? 0 : 1);
      b.spin = Math.max(0, b.spin - dt * 0.7);
      b.g.position.set(b.cx + Math.cos(b.angle) * b.radius, 0.012, b.cz + Math.sin(b.angle) * b.radius * 0.6);
      b.g.rotation.y = -b.angle + b.spin * 9;
      b.g.rotation.z = Math.sin(clock * 1.7 + b.angle) * 0.07 + b.spin * 0.35;
    }

    // Balloon.
    lift = Math.max(0, lift - dt * 0.5);
    const ba = clock * 0.07 + 1.2;
    balloon.position.set(Math.cos(ba) * 2.6 - 1.2, 1.5 + Math.sin(clock * 0.5) * 0.08 + Math.sin(lift * Math.PI) * 1.1, Math.sin(ba) * 1.4 - 1.6);
    balloon.rotation.y = clock * 0.2 + lift * 6;

    // Birds.
    const fa = clock * 0.22;
    flock.position.set(Math.cos(fa) * 3.2 + 0.8, 1.15 + Math.sin(clock * 0.4) * 0.15, Math.sin(fa) * 2.2 + 0.6);
    flock.rotation.y = -fa;
    for (const w of wings) w.rotation.z = Math.sin(clock * 9) * 0.6 * (w.userData.side as number);

    // Confetti.
    capitolPulse = Math.max(0, capitolPulse - dt * 1.4);
    if (sparkLife > 0) {
      sparkLife = Math.max(0, sparkLife - dt * 0.6);
      for (let i = 0; i < sparkN; i++) {
        sparkVel[i * 3 + 1] = sparkVel[i * 3 + 1]! - 2.6 * dt;
        for (let k = 0; k < 3; k++) sparkPos[i * 3 + k] = sparkPos[i * 3 + k]! + sparkVel[i * 3 + k]! * dt;
      }
      sparkGeo.attributes.position!.needsUpdate = true;
      sparkMat.opacity = sparkLife;
    }

    // Ripples.
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i]!;
      rp.life -= dt * 0.9;
      const s = (1 - rp.life) * 0.7 + 0.05;
      rp.m.scale.set(s, s, s);
      (rp.m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, rp.life) * 0.8;
      if (rp.life <= 0) {
        scene.remove(rp.m);
        rp.m.geometry.dispose();
        ripples.splice(i, 1);
      }
    }

    // Beacons rise, breathe, and the chosen one stands taller.
    beacons.forEach((b, i) => {
      const grown = Math.min(1, (clock - b.born) * 1.6);
      const chosen = focused === null || focused === i;
      const h = (chosen ? 1 : 0.55) * grown;
      b.beam.scale.set(1, Math.max(0.001, h), 1);
      b.beam.position.y = h * 0.9;
      (b.beam.material as THREE.MeshBasicMaterial).opacity = chosen ? 0.75 : 0.35;
      const pulse = 1 + ((clock * 0.8 + i * 0.3) % 1) * 1.6;
      b.ring.scale.set(pulse, pulse, pulse);
      (b.ring.material as THREE.MeshBasicMaterial).opacity = (1 - ((clock * 0.8 + i * 0.3) % 1)) * 0.7 * grown;
      b.label.position.y = h * 1.8 + 0.28;
      const size = (focused === i ? 0.62 : 0.46) * (rig.r / 9) * grown;
      b.label.scale.set(size, size, size);
    });

    // Camera: ease toward the pose, plus whatever the person has dragged.
    if (pose === 'thinking' && !calm) spinning += dt * 0.9;
    const g = pose === 'results' ? fitPins() : goal;
    rig.tx += (g.tx - rig.tx) * ease;
    rig.ty += (g.ty - rig.ty) * ease;
    rig.tz += (g.tz - rig.tz) * ease;
    rig.r += (g.r - rig.r) * ease;
    rig.phi += (g.phi - rig.phi) * ease;
    rig.theta += (g.theta + (pose === 'thinking' ? spinning : 0) - rig.theta) * ease;
    const drift = calm ? 0 : Math.sin(clock * 0.12) * 0.07;
    const th = rig.theta + user.theta + drift;
    const ph = Math.max(0.35, Math.min(1.5, rig.phi + user.phi));
    camera.position.set(rig.tx + rig.r * Math.sin(ph) * Math.sin(th), rig.ty + rig.r * Math.cos(ph), rig.tz + rig.r * Math.sin(ph) * Math.cos(th));
    camera.lookAt(rig.tx, rig.ty, rig.tz);
    dome.position.copy(camera.position);
    stars.position.copy(camera.position);

    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  // ------------------------------------------------------------ the handle

  return {
    setSky(input) {
      sky = input;
      const snow = input.snowIn >= 1;
      const m = input.month;
      landMat.color.set(snow ? '#e9eef1' : m >= 5 && m <= 9 ? '#6f9a5b' : m === 4 || m === 10 ? '#8f9858' : '#8d8a6c');
      treeMat.color.set(snow ? '#3d5f4c' : m >= 5 && m <= 9 ? '#3f7a48' : m === 10 ? '#b8752f' : m === 4 ? '#6f9a4c' : '#4f5d45');
      waterMat.color.set(input.frozen ? '#cfe1e8' : '#2f7fae');
      shoreMat.color.set(snow ? '#f4f7f9' : '#d8c9a2');
      waterMat.emissive.set(input.frozen ? '#3a4a52' : '#0d2a40');
      for (const b of boats) {
        b.sail.visible = b.hull.visible = !input.frozen;
        b.shanty.visible = input.frozen;
        if (input.frozen) b.speed = 0;
      }
    },
    setPose(next) {
      if (next === pose) return;
      pose = next;
      goal = { ...POSES[next] };
      user.theta = 0;
      user.phi = 0;
      if (next !== 'thinking') {
        // Don't unwind the spin: carry on from wherever the camera ended up.
        rig.theta = ((rig.theta + Math.PI) % (Math.PI * 2)) - Math.PI;
        spinning = 0;
      }
      balloon.visible = next === 'mood' || next === 'time';
    },
    setPins(pins) {
      for (const b of beacons) {
        scene.remove(b.g);
        const i = tappable.indexOf(b.g.userData.hit as THREE.Object3D);
        if (i >= 0) tappable.splice(i, 1);
      }
      focused = null;
      beacons = pins.map((p, i) => {
        const g = new THREE.Group();
        const pos = new THREE.Vector3(p.east, 0, -p.north);
        g.position.copy(pos);
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 1.8, 10, 1, true), new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.75, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.2, 28), new THREE.MeshBasicMaterial({ color: p.color, transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.03;
        const tag = label(i + 1, p.color);
        const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.6, 8), new THREE.MeshBasicMaterial({ visible: false }));
        hit.position.y = 1.2;
        hit.userData.tap = () => cb.onPin(i);
        g.userData.hit = hit;
        g.add(beam, ring, tag, hit);
        tappable.unshift(hit);
        scene.add(g);
        return { g, beam, ring, label: tag, pos, born: clock + i * 0.25 };
      });
    },
    focus(index) {
      focused = index;
    },
    dispose() {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onLeave);
      canvas.removeEventListener('pointerleave', onLeave);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        for (const x of Array.isArray(mat) ? mat : mat ? [mat] : []) x.dispose();
      });
      renderer.dispose();
    },
  };
}
