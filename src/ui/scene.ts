// The diorama: a small low-poly city under the real sky. The city center sits
// at the origin; one unit is one mile, +x is east, -z is north, so a place's
// latitude and longitude drop straight onto the model. The shorelines, roads
// and landmarks come from the city's shape file; nothing here knows Madison.
//
// Everything here is decoration except three things that talk back to the app:
// tapping a beacon (a pick), tapping the balloon ("surprise me"), and the
// first interaction (to retire the hint). Loaded lazily; if WebGL isn't there
// the page simply keeps its painted sky.

import * as THREE from 'three';
import { edgeDistance } from '../core/geo';
import type { CityShape, Landmark } from '../core/types';

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
  /** One-way travel time, to pace the little traveller on its route. */
  minutes?: number;
}

/** Something on tonight: a searchlight over its venue on the opening scene. */
export interface Live {
  east: number;
  north: number;
  label: string;
  color: string;
}

export type Pose = 'mood' | 'time' | 'thinking' | 'results';

export interface Diorama {
  setSky(input: SkyInput): void;
  setPose(pose: Pose): void;
  setPins(pins: Pin[]): void;
  /** Where the person is starting from, for the routes out to each pick. */
  setHome(home: { east: number; north: number } | null): void;
  setLive(spots: Live[]): void;
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
  [-1.0, '#050919', '#18214e', '#8fa3ff', 0.3, 0.34, 1, 1],
  [-0.35, '#121844', '#5d3a70', '#b9a4e8', 0.4, 0.42, 0.6, 1],
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

// ---------------------------------------------------------------- helpers

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
const unseen = () => new THREE.MeshBasicMaterial({ visible: false });

/** Flat strips along polylines given as [east, north, …]: roads, shores, the river. */
function ribbons(lines: { points: number[]; width: number }[], y: number): THREE.BufferGeometry {
  const pos: number[] = [];
  for (const { points, width } of lines) {
    for (let i = 0; i + 3 < points.length; i += 2) {
      const ax = points[i]!;
      const az = -points[i + 1]!;
      const bx = points[i + 2]!;
      const bz = -points[i + 3]!;
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 1e-4) continue;
      const ux = (bx - ax) / len;
      const uz = (bz - az) / len;
      const h = width / 2;
      // Run a little past each end so bends don't show gaps.
      const sx = ax - ux * h;
      const sz = az - uz * h;
      const ex = bx + ux * h;
      const ez = bz + uz * h;
      const nx = -uz * h;
      const nz = ux * h;
      pos.push(sx + nx, y, sz + nz, ex + nx, y, ez + nz, sx - nx, y, sz - nz, ex + nx, y, ez + nz, ex - nx, y, ez - nz, sx - nx, y, sz - nz);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** Soft round points that can twinkle: stars, street lights, headlights, fireflies. */
function glowPoints(spots: { x: number; y: number; z: number; color: string; size: number }[], opt: { attenuate: boolean; twinkle: number; speed: number; sharp: number; fog?: boolean }) {
  const n = spots.length;
  const pos = new Float32Array(n * 3);
  const tint = new Float32Array(n * 3);
  const size = new Float32Array(n);
  const phase = new Float32Array(n);
  const c = new THREE.Color();
  spots.forEach((s, i) => {
    pos.set([s.x, s.y, s.z], i * 3);
    c.set(s.color);
    tint.set([c.r, c.g, c.b], i * 3);
    size[i] = s.size;
    phase[i] = (i * 0.618034) % 1;
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('tint', new THREE.BufferAttribute(tint, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
  const uniforms = { time: { value: 0 }, opacity: { value: 0 }, scale: { value: 1 } };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 tint; attribute float size; attribute float phase; uniform float time; uniform float scale; varying vec3 vTint; varying float vA;
      void main(){ vTint = tint;
        float w = 0.5 + 0.5 * sin(time * ${opt.speed.toFixed(2)} + phase * 6.2832);
        vA = mix(1.0, pow(w, ${opt.sharp.toFixed(1)}), ${opt.twinkle.toFixed(2)});
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = ${opt.attenuate ? 'max(1.5, size * scale / -mv.z)' : 'size * scale'};
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float opacity; varying vec3 vTint; varying float vA;
      void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.08, d);
        gl_FragColor = vec4(vTint, a * vA * opacity); }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, uniforms, pos, geo, attenuate: opt.attenuate };
}

/** A line of text on a pill, as a sprite. */
function textSprite(): { sprite: THREE.Sprite; write(text: string): void } {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, fog: false, transparent: true, opacity: 0 }));
  sprite.renderOrder = 10;
  return {
    sprite,
    write(text) {
      const x = c.getContext('2d')!;
      x.clearRect(0, 0, 512, 96);
      x.font = `600 ${text.length > 22 ? 30 : 40}px Georgia, serif`;
      const w = Math.min(492, x.measureText(text).width + 56);
      x.fillStyle = 'rgba(16, 22, 34, 0.78)';
      x.beginPath();
      x.roundRect((512 - w) / 2, 12, w, 72, 36);
      x.fill();
      x.fillStyle = '#ffffff';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(text, 256, 50, 440);
      tex.needsUpdate = true;
    },
  };
}

// Leaves by month. Bare months get bark and a little left-over russet.
const LEAVES: Record<string, string[]> = {
  summer: ['#3f7a48', '#4a8a4e', '#35703f', '#5a9450', '#447f45'],
  spring: ['#7fae5a', '#8dbb62', '#6f9a4c', '#9cc46a', '#f0bfd0'],
  early: ['#4a8a4e', '#5a9450', '#3f7a48', '#a9b04a', '#d9b23a'],
  fall: ['#c8552b', '#d98a2b', '#e0b33a', '#a8402a', '#7d8f3e', '#e8a03a'],
  late: ['#9a5f36', '#7a6a52', '#b07a3a', '#6d6455', '#a2552f'],
  bare: ['#8a7d6c', '#96897a', '#7d7264'],
};
const leavesFor = (month: number) =>
  LEAVES[month >= 6 && month <= 8 ? 'summer' : month === 4 || month === 5 ? 'spring' : month === 9 ? 'early' : month === 10 ? 'fall' : month === 11 ? 'late' : 'bare']!;
const GROUND: Record<number, string> = { 1: '#8f8b70', 2: '#8f8b70', 3: '#8e9063', 4: '#84a25c', 5: '#6f9f58', 6: '#689a54', 7: '#6c9a55', 8: '#779a55', 9: '#85994f', 10: '#97964f', 11: '#99905f', 12: '#8f8b70' };

// ---------------------------------------------------------------- build

export function createDiorama(canvas: HTMLCanvasElement, shape: CityShape, cb: Callbacks, calm: boolean): Diorama {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 220);
  scene.fog = new THREE.Fog('#cfe6f2', 11, 44);

  // The lens. The scene is drawn off-screen, then shown through a tilt-shift
  // blur: sharp across the middle, soft toward the top and bottom, which is
  // what makes a real city photographed from above look like a toy. If the
  // off-screen buffer doesn't work on a device, we fall back to drawing direct.
  const target = new THREE.WebGLRenderTarget(4, 4, { samples: 4 });
  target.texture.colorSpace = THREE.SRGBColorSpace;
  const lens = { map: { value: target.texture }, px: { value: new THREE.Vector2(1, 1) }, focus: { value: 0.4 }, strength: { value: 1 } };
  const lensScene = new THREE.Scene();
  const lensCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  lensScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: lens, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D map; uniform vec2 px; uniform float focus; uniform float strength; varying vec2 vUv;
      void main(){
        float amt = smoothstep(0.1, 0.52, abs(vUv.y - focus)) * strength;
        vec2 r = px * amt;
        vec3 c = texture2D(map, vUv).rgb;
        c += texture2D(map, vUv + r * vec2(0.0, 1.0)).rgb + texture2D(map, vUv + r * vec2(0.87, 0.5)).rgb + texture2D(map, vUv + r * vec2(0.87, -0.5)).rgb;
        c += texture2D(map, vUv + r * vec2(0.0, -1.0)).rgb + texture2D(map, vUv + r * vec2(-0.87, -0.5)).rgb + texture2D(map, vUv + r * vec2(-0.87, 0.5)).rgb;
        c += texture2D(map, vUv + r * vec2(0.5, 0.0)).rgb + texture2D(map, vUv + r * vec2(-0.5, 0.0)).rgb + texture2D(map, vUv + r * vec2(0.0, 0.5)).rgb + texture2D(map, vUv + r * vec2(0.0, -0.5)).rgb;
        c /= 11.0;
        float l = dot(c, vec3(0.299, 0.587, 0.114));
        c = mix(vec3(l), c, 1.14);
        c *= mix(0.8, 1.0, smoothstep(1.05, 0.35, length(vUv - 0.5)));
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  })));
  let useLens = true;
  let frames = 0;

  const hemi = new THREE.HemisphereLight('#ffffff', '#9a9c86', 1);
  const sunLight = new THREE.DirectionalLight('#ffffff', 2);
  scene.add(hemi, sunLight);

  const rand = seeded(608);
  const pick = <T,>(list: T[]): T => list[Math.floor(rand() * list.length)]!;
  const dummy = new THREE.Object3D();
  const tmp = new THREE.Color();
  /** Materials whose windows come on at night, with how brightly. */
  const lit: { m: THREE.MeshLambertMaterial; k: number }[] = [];

  // Water, by the numbers: is this spot in (or within `pad` miles of) a lake?
  const lakeBox = shape.lakes.map((l) => {
    const xs = l.outline.filter((_, i) => i % 2 === 0);
    const ys = l.outline.filter((_, i) => i % 2 === 1);
    return { l, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  });
  const wet = (east: number, north: number, pad = 0) =>
    lakeBox.some((b) => east > b.x0 - pad && east < b.x1 + pad && north > b.y0 - pad && north < b.y1 + pad && edgeDistance(b.l.outline, east, north) < pad);
  const kept = shape.landmarks.filter((m) => m.kind === 'woods' || m.kind === 'airport' || m.kind === 'stadium');
  const quiet = (east: number, north: number) =>
    kept.some((m) => Math.hypot(east - m.east, north - m.north) < (m.kind === 'woods' ? m.radius ?? 0.3 : m.kind === 'airport' ? 0.8 : 0.22));

  // Sky dome: a gradient we repaint every frame, with a glow around the sun or moon.
  const skyUniforms = {
    top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() },
    body: { value: new THREE.Vector3(0, 1, 0) }, bodyColor: { value: new THREE.Color() }, bodyGlow: { value: 0 },
  };
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(100, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyUniforms,
      vertexShader: 'varying vec3 dir; void main(){ dir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 body; uniform vec3 bodyColor; uniform float bodyGlow; varying vec3 dir;
        void main(){ vec3 d = normalize(dir); float k = smoothstep(-0.02, 0.45, d.y);
          vec3 c = mix(horizon, top, k);
          float s = max(dot(d, body), 0.0);
          c += bodyColor * (pow(s, 40.0) * 0.5 + pow(s, 6.0) * 0.22) * bodyGlow * (1.0 - k * 0.45);
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    }),
  );
  scene.add(dome);

  // Stars.
  const starSpots = [];
  for (let i = 0; i < 420; i++) {
    const u = rand() * Math.PI * 2;
    const v = 0.08 + rand() * 0.9;
    const r = Math.sqrt(1 - v * v) * 90;
    starSpots.push({ x: Math.cos(u) * r, y: v * 90, z: Math.sin(u) * r, color: pick(['#ffffff', '#ffffff', '#cfe0ff', '#ffe9c4']), size: 1.2 + rand() ** 3 * 2.6 });
  }
  const stars = glowPoints(starSpots, { attenuate: false, twinkle: 0.55, speed: 1.6, sharp: 1 });
  scene.add(stars.points);

  // Sun and moon. Both tappable: they run the day forward.
  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(2.6, 24, 14), new THREE.MeshBasicMaterial({ color: '#ffe9a8', fog: false }));
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1.7, 24, 14), new THREE.MeshBasicMaterial({ color: '#eeeadb', fog: false, transparent: true }));
  moon.position.set(-22, 26, -52);
  scene.add(sunDisc, moon);

  // Land: a patchwork. Lawn in town, fields beyond it, all tinted by one seasonal color.
  const landMat = new THREE.MeshLambertMaterial({ color: '#6f9a5b', vertexColors: true });
  const landGeo = new THREE.PlaneGeometry(48, 48, 60, 60).toNonIndexed();
  landGeo.rotateX(-Math.PI / 2);
  {
    const p = landGeo.attributes.position!;
    const col = new Float32Array(p.count * 3);
    const FIELDS = [[1, 1, 1], [1.12, 1.06, 0.74], [0.86, 0.95, 0.82], [1.06, 1.1, 0.86], [0.94, 0.88, 0.7], [0.9, 1.02, 0.9]];
    for (let f = 0; f < p.count; f += 3) {
      const cx = (p.getX(f) + p.getX(f + 1) + p.getX(f + 2)) / 3;
      const cz = (p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2)) / 3;
      const far = Math.hypot(cx, cz) > shape.urbanRadius + 0.4;
      // Fields come in long lots; hash the lot, not the triangle.
      const lot = Math.sin(Math.floor(cx / 1.6) * 127.1 + Math.floor(cz / 0.8) * 311.7) * 43758.5453;
      const tone = far ? FIELDS[Math.floor((lot - Math.floor(lot)) * FIELDS.length)]! : [1, 1, 1];
      const grain = 0.96 + (Math.sin(cx * 12.9898 + cz * 78.233) * 0.5 + 0.5) * 0.08;
      for (let v = 0; v < 3; v++) col.set([tone[0]! * grain, tone[1]! * grain, tone[2]! * grain], (f + v) * 3);
    }
    landGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }
  scene.add(new THREE.Mesh(landGeo, landMat));
  const rimMat = flat('#6f9a5b');
  const rim = new THREE.Mesh(new THREE.CircleGeometry(90, 40), rimMat);
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = -0.02;
  scene.add(rim);

  // Lakes, on their real shorelines. The water is its own small shader: it
  // mirrors the sky, ripples, and catches the sun.
  const waterUniforms = {
    time: { value: 0 }, frozen: { value: 0 }, glint: { value: 1 },
    deep: { value: new THREE.Color('#2a78a8') }, skyTop: { value: new THREE.Color() }, skyHorizon: { value: new THREE.Color() },
    body: { value: new THREE.Vector3(0, 1, 0) }, bodyColor: { value: new THREE.Color('#fff3c4') },
  };
  const waterMat = new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), ...waterUniforms }, fog: true,
    vertexShader: `varying vec3 wp;
      #include <fog_pars_vertex>
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); wp = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform float time; uniform float frozen; uniform float glint; uniform vec3 deep; uniform vec3 skyTop; uniform vec3 skyHorizon; uniform vec3 body; uniform vec3 bodyColor; varying vec3 wp;
      #include <fog_pars_fragment>
      void main(){ vec2 p = wp.xz; float amp = 0.0034 * (1.0 - frozen) * clamp(3.5 / length(cameraPosition - wp), 0.12, 1.0);
        float a = p.x * 9.0 + time * 1.1; float b = p.y * 11.0 - time * 0.9; float c2 = (p.x + p.y) * 17.0 + time * 1.7; float d2 = (p.x - p.y) * 31.0 - time * 2.3;
        vec3 n = normalize(vec3((cos(a) * 9.0 + cos(c2) * 8.5 + cos(d2) * 5.0) * amp, 1.0, (cos(b) * 11.0 + cos(c2) * 8.5 - cos(d2) * 5.0) * amp));
        vec3 v = normalize(cameraPosition - wp);
        float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        vec3 r = reflect(-v, n);
        vec3 sky = mix(skyHorizon, skyTop, smoothstep(0.0, 0.5, r.y));
        vec3 col = mix(deep, sky, 0.16 + fres * 0.5);
        float s = max(dot(r, body), 0.0);
        col += bodyColor * (pow(s, 120.0) * 1.1 + pow(s, 14.0) * 0.09) * glint;
        float crack = smoothstep(0.96, 1.0, sin(p.x * 3.1 + sin(p.y * 2.3) * 2.0) * sin(p.y * 2.7 + sin(p.x * 1.9) * 2.0));
        vec3 ice = mix(vec3(0.78, 0.86, 0.9), sky, 0.3) + crack * 0.08;
        col = mix(col, ice, frozen);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  const shoreMat = flat('#d8c9a2');
  scene.add(new THREE.Mesh(ribbons(shape.lakes.map((l) => ({ points: [...l.outline, l.outline[0]!, l.outline[1]!], width: 0.09 })), 0.006), shoreMat));
  const lakes: THREE.Mesh[] = shape.lakes.map((l) => {
    const s = new THREE.Shape();
    for (let i = 0; i < l.outline.length; i += 2) (i === 0 ? s.moveTo : s.lineTo).call(s, l.outline[i]!, l.outline[i + 1]!);
    const g = new THREE.ShapeGeometry(s);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, waterMat);
    m.position.y = 0.012;
    m.userData.name = l.name;
    scene.add(m);
    return m;
  });
  scene.add(new THREE.Mesh(ribbons(shape.rivers.map((points) => ({ points, width: 0.045 })), 0.011), waterMat));

  // Roads: pale by day, amber threads at night.
  const roadMat = new THREE.MeshBasicMaterial({ color: '#d9d0bd' });
  scene.add(new THREE.Mesh(ribbons(shape.roads.map((r) => ({ points: r.slice(1), width: r[0] === 2 ? 0.05 : 0.032 })), 0.016), roadMat));

  // The building at the center: for Madison, the Capitol. Four wings to the
  // compass points, a drum, a ribbed dome, a lantern, and the gilt lady on top.
  const marble = new THREE.MeshLambertMaterial({ color: '#f1ece0', flatShading: true, emissive: '#ffe7b8', emissiveIntensity: 0 });
  const capitol = new THREE.Group();
  const lawnMat = flat('#5c9153');
  const lawn = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.5), lawnMat);
  lawn.rotation.y = shape.gridTurn;
  lawn.position.y = 0.01;
  capitol.add(lawn);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.1, 8), marble);
  base.position.y = 0.07;
  capitol.add(base);
  for (let i = 0; i < 4; i++) {
    const wing = new THREE.Group();
    const hall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.11), marble);
    hall.position.set(0.2, 0.07, 0);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.064, 0.2, 3, 1), marble);
    roof.rotation.set(0, 0, Math.PI / 2);
    roof.scale.set(0.45, 1, 1);
    roof.position.set(0.2, 0.134, 0);
    const steps = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.09), marble);
    steps.position.set(0.32, 0.035, 0);
    wing.add(hall, roof, steps);
    wing.rotation.y = (i * Math.PI) / 2;
    capitol.add(wing);
  }
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.16, 16), marble);
  drum.position.y = 0.2;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 16), marble);
  collar.position.y = 0.285;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.088, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), marble);
  cap.scale.y = 1.4;
  cap.position.y = 0.29;
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.07, 8), marble);
  lantern.position.y = 0.44;
  const gilt = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.07, 6), new THREE.MeshLambertMaterial({ color: '#e7b93e', emissive: '#e7b93e', emissiveIntensity: 0.6 }));
  gilt.position.y = 0.51;
  capitol.add(drum, collar, cap, lantern, gilt);
  scene.add(capitol);

  // Downtown, on the street grid. Nothing taller than the dome (in Madison, it's the law).
  const blockMat = new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true, emissive: '#ffc874', emissiveIntensity: 0 });
  lit.push({ m: blockMat, k: 0.22 });
  const blocks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), blockMat, 420);
  const lamps: { x: number; y: number; z: number; color: string; size: number }[] = [];
  const WINDOW = ['#ffcf8a', '#ffd9a0', '#fff1d0', '#ffc070'];
  let placed = 0;
  const gc = Math.cos(shape.gridTurn);
  const gs = Math.sin(shape.gridTurn);
  for (let u = -1.6; u <= 1.6 && placed < 420; u += 0.1) {
    for (let v = -1.6; v <= 1.6 && placed < 420; v += 0.1) {
      const east = u * gc - v * gs + (rand() - 0.5) * 0.02;
      const north = u * gs + v * gc + (rand() - 0.5) * 0.02;
      const d = Math.hypot(east, north);
      if (Math.max(Math.abs(u), Math.abs(v)) < 0.33 || d > 1.6 || rand() < 0.12 + d * 0.36 || wet(east, north, 0.07) || quiet(east, north)) continue;
      const h = 0.05 + rand() ** 1.6 * 0.3 * Math.max(0.12, 1 - d / 1.5);
      const campus = east < -0.65;
      dummy.position.set(east, h / 2, -north);
      dummy.scale.set(0.05 + rand() * 0.035, h, 0.05 + rand() * 0.035);
      dummy.rotation.set(0, shape.gridTurn, 0);
      dummy.updateMatrix();
      blocks.setMatrixAt(placed, dummy.matrix);
      blocks.setColorAt(placed, tmp.set(pick(campus ? ['#a8553f', '#b86b4a', '#d9cfc0', '#c9a889'] : ['#d9cfc0', '#b9ab98', '#a8b4bd', '#c7b8a2', '#8fa3b3', '#cfc6b8'])));
      placed++;
      for (let w = 0; w < 2 + Math.round(h * 16); w++) {
        const side = rand() * Math.PI * 2;
        lamps.push({ x: east + Math.cos(side) * 0.035, y: 0.02 + rand() * (h - 0.02), z: -north + Math.sin(side) * 0.035, color: pick(WINDOW), size: 0.03 });
      }
    }
  }
  blocks.count = placed;
  scene.add(blocks);

  // Neighborhoods: small houses with pitched roofs, thinning toward the edge of town.
  const houseMat = new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true, emissive: '#ffc874', emissiveIntensity: 0 });
  lit.push({ m: houseMat, k: 0.18 });
  const roofMat = flat('#ffffff');
  const HOUSES = 1300;
  const houses = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.03, 0.038), houseMat, HOUSES);
  const roofGeo = new THREE.CylinderGeometry(0.027, 0.027, 0.052, 3, 1);
  roofGeo.rotateZ(Math.PI / 2);
  roofGeo.scale(1, 0.55, 1);
  const roofs = new THREE.InstancedMesh(roofGeo, roofMat, HOUSES);
  placed = 0;
  for (let tries = 0; placed < HOUSES && tries < 12000; tries++) {
    const r = Math.sqrt(rand()) * shape.urbanRadius;
    const a = rand() * Math.PI * 2;
    const east = Math.cos(a) * r;
    const north = Math.sin(a) * r;
    if (r < 1.1 || rand() < (r / shape.urbanRadius) ** 2 * 0.7 || wet(east, north, 0.07) || quiet(east, north)) continue;
    const turn = (r < 2.6 ? shape.gridTurn : 0) + (rand() < 0.5 ? 0 : Math.PI / 2);
    const s = 0.9 + rand() * 0.5;
    dummy.position.set(east, 0.015 * s, -north);
    dummy.scale.set(s, s, s);
    dummy.rotation.set(0, turn, 0);
    dummy.updateMatrix();
    houses.setMatrixAt(placed, dummy.matrix);
    houses.setColorAt(placed, tmp.set(pick(['#e8dfd0', '#d8c7a8', '#c9d3d8', '#e3c9b0', '#b9c4a8', '#d6b8a0', '#f0ead8'])));
    dummy.position.y = 0.037 * s;
    dummy.updateMatrix();
    roofs.setMatrixAt(placed, dummy.matrix);
    roofs.setColorAt(placed, tmp.set(pick(['#7a5a4a', '#5d646b', '#8a4b3a', '#6b6258'])));
    if (rand() < 0.55) lamps.push({ x: east, y: 0.03, z: -north, color: pick(WINDOW), size: 0.03 });
    placed++;
  }
  houses.count = roofs.count = placed;
  scene.add(houses, roofs);

  // Out past the edge of town: red barns and silos. It is Wisconsin.
  const barnMat = flat('#a63a2e');
  const barns = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.07, 0.08), barnMat, 26);
  const barnRoofGeo = new THREE.CylinderGeometry(0.056, 0.056, 0.125, 3, 1);
  barnRoofGeo.rotateZ(Math.PI / 2);
  barnRoofGeo.scale(1, 0.6, 1);
  const barnRoofs = new THREE.InstancedMesh(barnRoofGeo, flat('#5b5f66'), 26);
  const silos = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.022, 0.022, 0.13, 8), flat('#d9dcd6'), 26);
  placed = 0;
  for (let tries = 0; placed < 26 && tries < 400; tries++) {
    const r = shape.urbanRadius + 0.8 + rand() * 7;
    const a = rand() * Math.PI * 2;
    const east = Math.cos(a) * r;
    const north = Math.sin(a) * r;
    if (wet(east, north, 0.2) || quiet(east, north)) continue;
    dummy.position.set(east, 0.035, -north);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, rand() * 3, 0);
    dummy.updateMatrix();
    barns.setMatrixAt(placed, dummy.matrix);
    dummy.position.y = 0.088;
    dummy.updateMatrix();
    barnRoofs.setMatrixAt(placed, dummy.matrix);
    dummy.position.set(east + 0.09, 0.065, -north + 0.03);
    dummy.updateMatrix();
    silos.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  barns.count = barnRoofs.count = silos.count = placed;
  scene.add(barns, barnRoofs, silos);

  // Trees: thick in the parks and preserves, along the streets, and in woodlots beyond.
  interface Tree { east: number; north: number; s: number; conifer: boolean; roll: number }
  const forest: Tree[] = [];
  const plant = (east: number, north: number, conifers = 0.16) => {
    if (wet(east, north, 0.03)) return;
    forest.push({ east, north, s: 0.7 + rand() * 0.8, conifer: rand() < conifers, roll: rand() });
  };
  for (const m of shape.landmarks) {
    if (m.kind !== 'woods') continue;
    const r = m.radius ?? 0.3;
    for (let i = 0; i < Math.round(r * r * 300) + 8; i++) {
      const d = Math.sqrt(rand()) * r;
      const a = rand() * Math.PI * 2;
      plant(m.east + Math.cos(a) * d, m.north + Math.sin(a) * d, 0.22);
    }
  }
  for (let i = 0; i < 20; i++) {
    // A ring of old trees around the square.
    const a = (i / 20) * Math.PI * 2;
    const r = 0.26 + (i % 2) * 0.035;
    forest.push({ east: Math.cos(a) * r * 1.02, north: Math.sin(a) * r * 1.02, s: 0.55, conifer: false, roll: rand() });
  }
  for (let i = 0; i < 700; i++) {
    const r = 0.45 + Math.sqrt(rand()) * (shape.urbanRadius + 0.6);
    const a = rand() * Math.PI * 2;
    if (r < 1.3 && rand() < 0.6) continue;
    plant(Math.cos(a) * r, Math.sin(a) * r);
  }
  for (let lot = 0; lot < 60; lot++) {
    const r = shape.urbanRadius + 0.5 + rand() * 12;
    const a = rand() * Math.PI * 2;
    for (let i = 0; i < 8 + rand() * 14; i++) plant(Math.cos(a) * r + (rand() - 0.5) * 1.1, Math.sin(a) * r + (rand() - 0.5) * 0.7, 0.3);
  }
  const leafMat = new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true, emissive: '#1f3a24', emissiveIntensity: 0.25 });
  const pineMat = new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true, emissive: '#16301f', emissiveIntensity: 0.3 });
  const broad = forest.filter((t) => !t.conifer);
  const pines = forest.filter((t) => t.conifer);
  const crownGeo = new THREE.IcosahedronGeometry(0.075, 0);
  crownGeo.scale(1, 1.15, 1);
  const crowns = new THREE.InstancedMesh(crownGeo, leafMat, broad.length);
  const firs = new THREE.InstancedMesh(new THREE.ConeGeometry(0.06, 0.22, 5), pineMat, pines.length);
  broad.forEach((t, i) => {
    dummy.position.set(t.east, 0.075 * t.s, -t.north);
    dummy.scale.set(t.s, t.s, t.s);
    dummy.rotation.set(0, t.roll * 6, 0);
    dummy.updateMatrix();
    crowns.setMatrixAt(i, dummy.matrix);
  });
  pines.forEach((t, i) => {
    dummy.position.set(t.east, 0.11 * t.s, -t.north);
    dummy.scale.set(t.s, t.s, t.s);
    dummy.rotation.set(0, t.roll * 6, 0);
    dummy.updateMatrix();
    firs.setMatrixAt(i, dummy.matrix);
  });
  scene.add(crowns, firs);
  let dressedFor = '';
  const dress = (month: number, snow: boolean) => {
    const key = `${month}${snow}`;
    if (key === dressedFor) return;
    dressedFor = key;
    // Bare branches: thinner, see-through crowns from November to March.
    const bare = month >= 11 || month <= 3;
    leafMat.transparent = bare;
    leafMat.opacity = bare ? (month === 11 ? 0.8 : 0.5) : 1;
    leafMat.depthWrite = !bare;
    leafMat.needsUpdate = true;
    const palette = leavesFor(month);
    const white = new THREE.Color('#f2f5f6');
    broad.forEach((t, i) => {
      tmp.set(palette[Math.floor(t.roll * palette.length)]!);
      if (snow) tmp.lerp(white, 0.45);
      crowns.setColorAt(i, tmp);
    });
    pines.forEach((t, i) => {
      tmp.set(t.roll < 0.5 ? '#2f5d3f' : '#356848');
      if (snow) tmp.lerp(white, 0.35);
      firs.setColorAt(i, tmp);
    });
    if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
    if (firs.instanceColor) firs.instanceColor.needsUpdate = true;
  };
  dress(7, false);

  // ------------------------------------------------------------ things you can touch

  const tappable: THREE.Object3D[] = [];
  const pinHits: THREE.Object3D[] = [];
  const nameTag = textSprite();
  scene.add(nameTag.sprite);
  let nameLife = 0;
  const say = (text: string, at: THREE.Vector3) => {
    nameTag.write(text);
    nameTag.sprite.position.copy(at);
    nameLife = 2.6;
  };
  const touchable = (name: string, east: number, north: number, radius: number, height: number, also?: () => void) => {
    const hit = new THREE.Mesh(new THREE.SphereGeometry(radius, 8, 6), unseen());
    hit.position.set(east, height * 0.5, -north);
    hit.userData.tap = () => {
      say(name, new THREE.Vector3(east, height + 0.22, -north));
      also?.();
    };
    tappable.push(hit);
    scene.add(hit);
  };

  // Landmarks.
  const concrete = flat('#cfcac0');
  const brick = new THREE.MeshLambertMaterial({ color: '#a8553f', flatShading: true, emissive: '#ffc874', emissiveIntensity: 0 });
  const pale = new THREE.MeshLambertMaterial({ color: '#ece8de', flatShading: true, emissive: '#ffe7b8', emissiveIntensity: 0 });
  const glass = new THREE.MeshLambertMaterial({ color: '#a9d6e2', flatShading: true, transparent: true, opacity: 0.85, emissive: '#ffe9b0', emissiveIntensity: 0 });
  const gold = new THREE.MeshLambertMaterial({ color: '#e7b93e', flatShading: true, emissive: '#e7b93e', emissiveIntensity: 0.4 });
  lit.push({ m: brick, k: 0.25 }, { m: pale, k: 0.45 }, { m: glass, k: 0.9 });
  const pitchMat = flat('#4f9a4a');
  let airport: Landmark | undefined;
  const build: Record<Landmark['kind'], (g: THREE.Group, m: Landmark) => number> = {
    stadium(g) {
      const bowl = new THREE.CylinderGeometry(0.17, 0.12, 0.075, 22, 1, true);
      const out = new THREE.Mesh(bowl, concrete);
      const seats = new THREE.Mesh(bowl, new THREE.MeshLambertMaterial({ color: '#c5050c', side: THREE.BackSide, flatShading: true }));
      const pitch = new THREE.Mesh(new THREE.CircleGeometry(0.12, 22), pitchMat);
      pitch.rotation.x = -Math.PI / 2;
      pitch.position.y = 0.006;
      out.position.y = seats.position.y = 0.0375;
      g.add(out, seats, pitch);
      g.scale.set(0.72, 1, 1.15);
      return 0.25;
    },
    arena(g) {
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.06, 20), pale);
      wall.position.y = 0.03;
      const roof = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 6, 0, Math.PI * 2, 0, Math.PI / 2), concrete);
      roof.scale.y = 0.3;
      roof.position.y = 0.06;
      g.add(wall, roof);
      return 0.2;
    },
    terrace(g) {
      // A white crescent stepping out over the water.
      const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 18, 1, false, 0, Math.PI), pale);
      deck.position.y = 0.03;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.012, 18, 1, false, 0, Math.PI), pitchMat);
      top.position.y = 0.06;
      for (const z of [-0.1, 0.1]) {
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.09, 10), pale);
        tower.position.set(-0.01, 0.045, z);
        g.add(tower);
      }
      g.add(deck, top);
      return 0.22;
    },
    union(g) {
      const hall = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.16), brick);
      hall.position.set(-0.05, 0.035, 0);
      const patio = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.008, 0.2), concrete);
      patio.position.set(0.04, 0.008, 0);
      const pier = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.008, 0.012), flat('#8a6a48'));
      pier.position.set(0.15, 0.02, 0.05);
      g.add(hall, patio, pier);
      // The sunburst chairs: green, yellow, orange.
      const chair = new THREE.BoxGeometry(0.012, 0.014, 0.012);
      const paints = ['#3f9a4a', '#f2c230', '#ee7a2a'].map((c) => flat(c, { emissive: c, emissiveIntensity: 0.25 }));
      for (let i = 0; i < 21; i++) {
        const c = new THREE.Mesh(chair, paints[i % 3]!);
        c.position.set(0.012 + (i % 3) * 0.026 + rand() * 0.008, 0.02, -0.085 + Math.floor(i / 3) * 0.028 + rand() * 0.008);
        g.add(c);
      }
      return 0.2;
    },
    hall(g) {
      const rise = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.07, 14), lawnMat);
      rise.position.y = 0.035;
      const hall = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.13), pale);
      hall.position.set(-0.02, 0.085, 0);
      const porch = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.045, 0.045), pale);
      porch.position.set(0.012, 0.085, 0);
      g.add(rise, hall, porch);
      return 0.2;
    },
    tower(g) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.045), new THREE.MeshLambertMaterial({ color: '#c9bca8', flatShading: true, emissive: '#ffc874', emissiveIntensity: 0 }));
      lit.push({ m: t.material, k: 0.4 });
      t.position.y = 0.15;
      g.add(t);
      return 0.16;
    },
    glasshouse(g) {
      // A glass pyramid full of palms, and a gilded pavilion beside it.
      const pyramid = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.1, 4), glass);
      pyramid.rotation.y = Math.PI / 4;
      pyramid.position.y = 0.05;
      const pav = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.03, 0.045), pale);
      pav.position.set(0.15, 0.015, 0.08);
      for (let i = 0; i < 2; i++) {
        const tier = new THREE.Mesh(new THREE.ConeGeometry(0.05 - i * 0.018, 0.035, 4), gold);
        tier.rotation.y = Math.PI / 4;
        tier.position.set(0.15, 0.047 + i * 0.028, 0.08);
        g.add(tier);
      }
      g.add(pyramid, pav);
      return 0.22;
    },
    airport(g, m) {
      airport = m;
      const tarmac = flat('#5a5d62');
      for (const [turn, len] of [[0, 1.5], [1.05, 1.2]] as const) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(len, 0.006, 0.06), tarmac);
        strip.rotation.y = turn;
        strip.position.y = 0.006;
        g.add(strip);
      }
      const terminal = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.07), pale);
      terminal.position.set(-0.3, 0.02, 0.35);
      g.add(terminal);
      return 0.5;
    },
    woods: (_g, m) => (m.radius ?? 0.3) * 0.8,
  };
  const named = new Set<string>();
  for (const m of shape.landmarks) {
    const g = new THREE.Group();
    g.position.set(m.east, 0, -m.north);
    g.rotation.y = m.turn ?? 0;
    const reach = build[m.kind](g, m);
    scene.add(g);
    if (m.kind === 'woods' && (named.has(m.name) || reach < 0.2)) continue;
    named.add(m.name);
    touchable(m.name, m.east, m.north, reach, m.kind === 'woods' ? 0.2 : m.kind === 'tower' ? 0.34 : 0.14);
  }

  // Night: windows, porch lights, and lamps along the big roads.
  for (const r of shape.roads) {
    let carry = 0;
    for (let i = 1; i + 3 < r.length; i += 2) {
      const len = Math.hypot(r[i + 2]! - r[i]!, r[i + 3]! - r[i + 1]!);
      for (let d = carry; d < len; d += 0.2) {
        const k = d / len;
        lamps.push({ x: r[i]! + (r[i + 2]! - r[i]!) * k, y: 0.04, z: -(r[i + 1]! + (r[i + 3]! - r[i + 1]!) * k), color: '#ffb866', size: r[0] === 2 ? 0.045 : 0.036 });
      }
      carry = (carry - len) % 0.2;
      if (carry < 0) carry += 0.2;
    }
  }
  const cityLights = glowPoints(lamps, { attenuate: true, twinkle: 0.25, speed: 1.1, sharp: 1 });
  scene.add(cityLights.points);

  // Traffic: a few dozen headlights that follow the real roads.
  const routes = shape.roads.filter((r) => r.length >= 7).map((r) => {
    const pts = r.slice(1);
    const cum = [0];
    for (let i = 0; i + 3 < pts.length; i += 2) cum.push(cum[cum.length - 1]! + Math.hypot(pts[i + 2]! - pts[i]!, pts[i + 3]! - pts[i + 1]!));
    return { pts, cum, len: cum[cum.length - 1]! };
  }).filter((r) => r.len > 0.5);
  const cars = Array.from({ length: routes.length ? 70 : 0 }, () => ({ route: pick(routes), d: rand(), speed: (0.18 + rand() * 0.2) * (rand() < 0.5 ? 1 : -1) }));
  const traffic = glowPoints(cars.map(() => ({ x: 0, y: 0.03, z: 0, color: '#fff6dd', size: 0.03 })), { attenuate: true, twinkle: 0, speed: 0, sharp: 1 });
  scene.add(traffic.points);

  // Fireflies, on warm summer nights.
  const fireflies = glowPoints(Array.from({ length: 70 }, () => ({ x: (rand() - 0.5) * 3.4, y: 0.03 + rand() * 0.3, z: (rand() - 0.5) * 3.4, color: '#d8ff6a', size: 0.03 })), { attenuate: true, twinkle: 1, speed: 2.2, sharp: 6 });
  scene.add(fireflies.points);

  // Clouds: soft clumps that drift, thicker when the forecast says so.
  const cloudMat = new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true, transparent: true, opacity: 0.9 });
  const clouds: THREE.Group[] = [];
  for (let i = 0; i < 12; i++) {
    const g = new THREE.Group();
    const n = 4 + Math.floor(rand() * 4);
    for (let j = 0; j < n; j++) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45 + rand() * 0.55, 1), cloudMat);
      puff.position.set((j - n / 2) * 0.55 + rand() * 0.2, rand() * 0.3, (rand() - 0.5) * 0.7);
      puff.scale.y = 0.5;
      g.add(puff);
    }
    g.position.set(-18 + rand() * 36, 4.8 + rand() * 2.2, -20 + rand() * 20);
    g.userData.speed = 0.07 + rand() * 0.1;
    clouds.push(g);
    scene.add(g);
  }

  // Sailboats on the lakes (ice shanties when they freeze).
  const hullMat = flat('#f4efe4');
  const shantyMat = flat('#b5543a');
  interface Boat { g: THREE.Group; sail: THREE.Mesh; shanty: THREE.Mesh; hull: THREE.Mesh; angle: number; radius: number; speed: number; spin: number; cx: number; cz: number }
  const boats: Boat[] = [];
  const SAILS = ['#ffffff', '#ffffff', '#f6d15a', '#e2574c', '#ffffff', '#7fc4e8'];
  lakeBox.forEach((b, li) => {
    const want = Math.min(5, Math.round(((b.x1 - b.x0) * (b.y1 - b.y0)) / 4.5));
    for (let i = 0, tries = 0; i < want && tries < 200; tries++) {
      const east = b.x0 + rand() * (b.x1 - b.x0);
      const north = b.y0 + rand() * (b.y1 - b.y0);
      if (edgeDistance(b.l.outline, east, north) > -0.42 || Math.hypot(east, north) > 6) continue;
      i++;
      const g = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 4), hullMat);
      hull.rotation.set(Math.PI / 2, 0, 0);
      hull.scale.set(1, 1, 0.5);
      hull.position.y = 0.035;
      const tri = new THREE.BufferGeometry();
      tri.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.05, -0.06, 0, 0.32, -0.02, 0, 0.05, 0.1], 3));
      tri.computeVertexNormals();
      const sail = new THREE.Mesh(tri, new THREE.MeshLambertMaterial({ color: SAILS[(boats.length + li) % SAILS.length]!, side: THREE.DoubleSide }));
      const shanty = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.09), shantyMat);
      shanty.position.y = 0.05;
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 4), unseen());
      g.add(hull, sail, shanty, hit);
      const boat: Boat = { g, sail, shanty, hull, angle: rand() * 6, radius: 0.18 + rand() * 0.2, speed: 0.12 + rand() * 0.1, spin: 0, cx: east, cz: -north };
      hit.userData.tap = () => { boat.spin = 1; };
      tappable.push(hit);
      boats.push(boat);
      scene.add(g);
    }
  });

  // The balloon: tap it and you're asking for a surprise.
  const balloon = new THREE.Group();
  const envGeo = new THREE.SphereGeometry(0.34, 16, 10).toNonIndexed();
  {
    const p = envGeo.attributes.position!;
    const col = new Float32Array(p.count * 3);
    const stripes = [new THREE.Color('#e2574c'), new THREE.Color('#f6e7c8'), new THREE.Color('#f6b53a'), new THREE.Color('#f6e7c8')];
    for (let f = 0; f < p.count; f += 3) {
      const a = Math.atan2((p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2)) / 3, (p.getX(f) + p.getX(f + 1) + p.getX(f + 2)) / 3);
      const c = stripes[Math.floor(((a + Math.PI) / (Math.PI * 2)) * 16 + 16) % 4]!;
      for (let v = 0; v < 3; v++) col.set([c.r, c.g, c.b], (f + v) * 3);
    }
    envGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    envGeo.computeVertexNormals();
  }
  const envelope = new THREE.Mesh(envGeo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: '#70362a', emissiveIntensity: 0.5 }));
  envelope.scale.y = 1.2;
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.07, 0.18, 12, 1, true), flat('#e2574c', { emissive: '#ffb04a', emissiveIntensity: 0.4, side: THREE.DoubleSide }));
  skirt.position.y = -0.41;
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.09), flat('#7a5230'));
  basket.position.y = -0.6;
  const balloonHit = new THREE.Mesh(new THREE.SphereGeometry(0.62, 8, 6), unseen());
  balloon.add(envelope, skirt, basket, balloonHit);
  let lift = 0;
  balloonHit.userData.tap = () => { lift = 1; cb.onBalloon(); };
  tappable.push(balloonHit);
  scene.add(balloon);

  // A small plane on a wide loop out of the airport. Tap it for a barrel roll.
  const plane = new THREE.Group();
  let roll = 0;
  if (airport) {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.012, 0.24, 8), pale);
    body.rotation.x = Math.PI / 2;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.006, 0.05), pale);
    wing.position.z = -0.02;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.006, 0.03), pale);
    tail.position.z = 0.11;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.05, 0.035), flat('#c5050c'));
    fin.position.set(0, 0.025, 0.11);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.45, 6, 4), unseen());
    const name = airport.name;
    hit.userData.tap = () => {
      roll = 1;
      say(`Out of ${name.replace(/ (Regional |International )?Airport$/, '')}`, plane.position.clone().add(new THREE.Vector3(0, 0.4, 0)));
    };
    tappable.push(hit);
    plane.add(body, wing, tail, fin, hit);
    scene.add(plane);
  }

  // Birds.
  const birdMat = new THREE.MeshBasicMaterial({ color: '#1d2a33', side: THREE.DoubleSide });
  const flock = new THREE.Group();
  const wings: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i++) {
    const bird = new THREE.Group();
    for (const side of [-1, 1]) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, side * 0.09, 0, -0.03, side * 0.09, 0, 0.03], 3));
      const w = new THREE.Mesh(g, birdMat);
      w.userData.side = side;
      wings.push(w);
      bird.add(w);
    }
    // A loose V.
    const rank = Math.ceil(i / 2);
    bird.position.set((i % 2 ? 1 : -1) * rank * 0.16, (rand() - 0.5) * 0.05, rank * 0.2);
    flock.add(bird);
  }
  scene.add(flock);

  // Weather: one cloud of particles reused for rain or snow.
  const drops = 700;
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
  weather.frustumCulled = false;
  scene.add(weather);

  // Tapping the center throws a little confetti.
  const sparkN = 120;
  const sparkPos = new Float32Array(sparkN * 3);
  const sparkVel = new Float32Array(sparkN * 3);
  const sparkCol = new Float32Array(sparkN * 3);
  for (let i = 0; i < sparkN; i++) {
    tmp.set(pick(['#ffd76a', '#ff7a6a', '#7fd0ff', '#ffffff', '#9fe08a']));
    sparkCol.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  sparkGeo.setAttribute('color', new THREE.BufferAttribute(sparkCol, 3));
  const sparkMat = new THREE.PointsMaterial({ vertexColors: true, size: 4, sizeAttenuation: false, transparent: true, opacity: 0, fog: false });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  scene.add(sparks);
  let sparkLife = 0;
  let capitolPulse = 0;
  touchable(shape.centerLabel, 0, 0, 0.36, 0.5, () => {
    capitolPulse = 1;
    sparkLife = 1;
    for (let i = 0; i < sparkN; i++) {
      sparkPos.set([0, 0.5, 0], i * 3);
      const a = Math.random() * Math.PI * 2;
      const up = 0.9 + Math.random() * 1.4;
      const out = 0.2 + Math.random() * 0.7;
      sparkVel.set([Math.cos(a) * out, up, Math.sin(a) * out], i * 3);
    }
  });

  // Ripples where you touch the water, and the lake's name.
  const ripples: { m: THREE.Mesh; life: number }[] = [];
  let isFrozen = false;
  for (const lake of lakes) {
    lake.userData.tap = (p: THREE.Vector3) => {
      say(lake.userData.name as string, new THREE.Vector3(p.x, 0.3, p.z));
      if (isFrozen) return;
      for (let k = 0; k < 2; k++) {
        const m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 32), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
        m.rotation.x = -Math.PI / 2;
        m.position.set(p.x, 0.02, p.z);
        scene.add(m);
        ripples.push({ m, life: 1 + k * 0.35 });
      }
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
  /** Seconds left looking at the whole spread before closing in on the chosen pick. */
  let hop = 0;
  let fresh = false;
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

  // Routes: from where you're starting, an arc out to each pick, with a small traveller on it.
  let home: THREE.Vector3 | null = null;
  let lastPins: Pin[] = [];
  interface Route { tube: THREE.Mesh; dot: THREE.Mesh; curve: THREE.QuadraticBezierCurve3; total: number; period: number; born: number }
  let trips: Route[] = [];
  const youTag = textSprite();
  youTag.write('You');
  youTag.sprite.material.opacity = 1;
  const you = new THREE.Group();
  const youRing = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.14, 28), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false }));
  youRing.rotation.x = -Math.PI / 2;
  youRing.position.y = 0.03;
  const youDot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false }));
  youDot.position.y = 0.09;
  youTag.sprite.position.y = 0.42;
  you.add(youRing, youDot, youTag.sprite);
  you.visible = false;
  scene.add(you);
  const dotGeo = new THREE.SphereGeometry(0.05, 10, 8);
  const layRoutes = () => {
    for (const r of trips) {
      scene.remove(r.tube, r.dot);
      r.tube.geometry.dispose();
    }
    trips = [];
    you.visible = Boolean(home) && lastPins.length > 0;
    if (!home || !you.visible) return;
    you.position.copy(home);
    lastPins.forEach((p, i) => {
      const end = new THREE.Vector3(p.east, 0.03, -p.north);
      const start = home!.clone().setY(0.06);
      const far = start.distanceTo(end);
      if (far < 0.12) return;
      const mid = start.clone().add(end).multiplyScalar(0.5).setY(Math.min(2.4, Math.max(0.3, far * 0.24)));
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const geo = new THREE.TubeGeometry(curve, 48, Math.min(0.05, Math.max(0.018, far * 0.006)), 6);
      const tube = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(p.color).lerp(new THREE.Color('#ffffff'), 0.35), transparent: true, opacity: 0.9, fog: false, depthWrite: false }));
      const dot = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', fog: false }));
      scene.add(tube, dot);
      trips.push({ tube, dot, curve, total: geo.index!.count, period: Math.min(9, Math.max(2.5, (p.minutes ?? 10) / 4)), born: clock + 0.6 + i * 0.3 });
    });
  };

  // Tonight: a searchlight over every venue with something on in the next few hours.
  interface Beam { g: THREE.Group; cone: THREE.Mesh; hit: THREE.Mesh; i: number }
  let beams: Beam[] = [];
  const coneGeo = new THREE.CylinderGeometry(0.075, 0.008, 1.7, 10, 1, true);
  coneGeo.translate(0, 0.85, 0);

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
    // Frame the picks and where you're starting from together.
    const pts = [...beacons.map((b) => b.pos), ...(home ? [home] : [])];
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const cz = pts.reduce((s, p) => s + p.z, 0) / pts.length;
    const spread = Math.max(...pts.map((p) => Math.hypot(p.x - cx, p.z - cz)));
    const all = Math.min(28, Math.max(8, 6 + spread * 3.4));
    const one = focused === null ? undefined : beacons[focused];
    if (!one) return { tx: cx, ty: all * 0.1, tz: cz, theta: 0.5, phi: 1.0, r: all };
    // Changing picks: pull back until all three are in view, then come down on the new one.
    if (hop > 0) return { tx: cx, ty: all * 0.1, tz: cz, theta: 0.5, phi: 1.0, r: all };
    return { tx: one.pos.x, ty: 1.05, tz: one.pos.z, theta: 0.5, phi: 1.05, r: 4.4 };
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
    const hit = ray.intersectObjects(pinHits, false)[0] ?? ray.intersectObjects(tappable, false)[0];
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
  const white = new THREE.Color('#ffffff');
  const probe = new THREE.Vector3();

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * renderer.getPixelRatio()) || canvas.height !== Math.round(h * renderer.getPixelRatio())) {
      renderer.setSize(w, h, false);
      const pr = renderer.getPixelRatio();
      target.setSize(Math.round(w * pr), Math.round(h * pr));
      lens.px.value.set(6 / w, 6 / h);
      camera.aspect = w / h;
      // Keep the town in frame on a tall phone and a wide desktop alike.
      camera.fov = w / h < 1 ? 52 : w / h < 1.8 ? 42 : 32;
      camera.updateProjectionMatrix();
      const px = (h * renderer.getPixelRatio()) / (2 * Math.tan((camera.fov * Math.PI) / 360));
      for (const p of [stars, cityLights, traffic, fireflies]) p.uniforms.scale.value = p.attenuate ? px : renderer.getPixelRatio();
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
      hemi.color.copy(look.top).lerp(white, 0.55 - look.glow * 0.25);
      hemi.groundColor.set('#9a9c86').lerp(tmp.set('#2a3560'), look.glow * 0.8);
      sunLight.intensity = look.sun;
      sunLight.color.copy(look.light);
      stars.uniforms.opacity.value = look.stars;
      for (const l of lit) l.m.emissiveIntensity = look.glow * l.k;
      marble.emissiveIntensity = look.glow * 0.55 + capitolPulse * 1.2;
      cityLights.uniforms.opacity.value = look.glow * (1 - wetNow * 0.3);
      traffic.uniforms.opacity.value = 0.35 + look.glow * 0.65;
      roadMat.color.set('#d9d0bd').multiplyScalar(0.3 + 0.7 * Math.min(1, look.ambient)).lerp(tmp.set('#6b4a2c'), look.glow * 0.8);
      cloudMat.color.copy(look.horizon).lerp(white, e > 0.2 ? 0.75 : 0.25);

      // The sun crosses the far (north-western) sky so it sets where Madison watches it set: over the big lake.
      const up = e > -0.08;
      sunDisc.visible = up;
      const a = Math.PI * p;
      sunDisc.position.set(Math.cos(a) * 46 - 8, Math.sin(a) * 30 + 0.5, -52 + Math.sin(a) * 6);
      // Stylized: the key light always comes over the viewer's shoulder, so the town is never a silhouette.
      sunLight.position.set(Math.cos(a) * 5 + 3, 6 + Math.sin(a) * 3, 6);
      const sunColor = (sunDisc.material as THREE.MeshBasicMaterial).color.set('#ff9a52').lerp(tmp.set('#fff3c4'), Math.min(1, Math.max(0, e * 2.2)));
      (moon.material as THREE.MeshBasicMaterial).opacity = Math.min(1, Math.max(0, -e * 3)) * (1 - wetNow * 0.8);
      moon.visible = e < 0;

      // Whichever is up lights the sky around it and lays a path on the water.
      const body = up ? sunDisc : moon;
      const dry = 1 - wetNow * 0.85;
      skyUniforms.body.value.copy(body.position).sub(camera.position).normalize();
      skyUniforms.bodyColor.value.copy(up ? sunColor : tmp.set('#aab6e8'));
      skyUniforms.bodyGlow.value = (up ? 0.55 + (1 - Math.max(0, e)) * 0.6 : 0.3 * (moon.material as THREE.MeshBasicMaterial).opacity) * dry;
      waterUniforms.body.value.copy(skyUniforms.body.value);
      waterUniforms.bodyColor.value.copy(skyUniforms.bodyColor.value);
      waterUniforms.glint.value = (up ? 1 : 0.5) * dry * (1 - waterUniforms.frozen.value * 0.7);
      waterUniforms.skyTop.value.copy(look.top);
      waterUniforms.skyHorizon.value.copy(look.horizon);
      waterUniforms.deep.value.set('#2a78a8').multiplyScalar(Math.min(1, 0.16 + Math.max(0, e + 0.15) * 1.6)).lerp(tmp.set('#5d6f78'), wetNow * 0.5);
      waterUniforms.frozen.value += ((sky.frozen ? 1 : 0) - waterUniforms.frozen.value) * ease;

      // Fireflies: June to August, after dark, when it isn't raining.
      const summer = sky.month >= 6 && sky.month <= 8 && lapse === 0;
      fireflies.uniforms.opacity.value += ((summer && e < -0.15 && sky.wet < 0.3 ? 0.9 : 0) - fireflies.uniforms.opacity.value) * ease;

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
      if (c.position.x > 18) c.position.x = -18;
      c.visible = i < 4 + Math.round(wetNow * 8);
    });
    cloudMat.opacity = 0.6 + wetNow * 0.35;

    // Everything that keeps its own time.
    waterUniforms.time.value = clock;
    for (const p of [stars, cityLights, fireflies]) p.uniforms.time.value = clock;
    fireflies.points.position.set(rig.tx, 0, rig.tz);

    // Traffic.
    cars.forEach((c, i) => {
      const r = c.route;
      c.d = (((c.d + (c.speed * dt * (calm ? 0 : 1)) / r.len) % 1) + 1) % 1;
      const want = c.d * r.len;
      let k = 1;
      while (k < r.cum.length - 1 && r.cum[k]! < want) k++;
      const f = (want - r.cum[k - 1]!) / Math.max(1e-6, r.cum[k]! - r.cum[k - 1]!);
      const j = (k - 1) * 2;
      traffic.pos[i * 3] = r.pts[j]! + (r.pts[j + 2]! - r.pts[j]!) * f;
      traffic.pos[i * 3 + 2] = -(r.pts[j + 1]! + (r.pts[j + 3]! - r.pts[j + 1]!) * f);
    });
    traffic.geo.attributes.position!.needsUpdate = true;

    // The plane.
    if (airport) {
      roll = Math.max(0, roll - dt * 0.8);
      const pa = clock * 0.085 + 2;
      plane.position.set(Math.cos(pa) * 4.6 + airport.east * 0.35, 2.1 + Math.sin(clock * 0.3) * 0.15, Math.sin(pa) * 3.6 - airport.north * 0.35);
      plane.rotation.set(0, -pa + Math.PI, 0);
      plane.rotateZ(-0.25 + (1 - roll) * Math.PI * 2 * (roll > 0 ? 1 : 0));
    }

    // Names fade.
    nameLife = Math.max(0, nameLife - dt);
    nameTag.sprite.material.opacity = Math.min(1, nameLife * 2.5);
    nameTag.sprite.visible = nameLife > 0;
    if (nameLife > 0) {
      const far = camera.position.distanceTo(nameTag.sprite.position) * 0.05;
      nameTag.sprite.scale.set(far * 5.33, far, 1);
    }

    // Boats sail lazy circles; a tapped one spins like it caught a gust.
    for (const b of boats) {
      b.angle += b.speed * dt * (1 + b.spin * 5) * (calm ? 0 : 1);
      b.spin = Math.max(0, b.spin - dt * 0.7);
      b.g.position.set(b.cx + Math.cos(b.angle) * b.radius, 0.012, b.cz + Math.sin(b.angle) * b.radius * 0.7);
      b.g.rotation.y = -b.angle + b.spin * 9;
      b.g.rotation.z = Math.sin(clock * 1.7 + b.angle) * 0.07 + b.spin * 0.35;
    }

    // Balloon.
    lift = Math.max(0, lift - dt * 0.5);
    const ba = clock * 0.07 + 1.2;
    balloon.position.set(Math.cos(ba) * 2.6 - 1.2, 1.6 + Math.sin(clock * 0.5) * 0.08 + Math.sin(lift * Math.PI) * 1.1, Math.sin(ba) * 1.4 - 1.6);
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

    hop = Math.max(0, hop - dt);

    // Routes draw themselves out, then a traveller runs each one, slower for the longer trips.
    for (const r of trips) {
      const grown = Math.min(1, Math.max(0, (clock - r.born) * 0.9));
      r.tube.geometry.setDrawRange(0, Math.floor((r.total * grown) / 3) * 3);
      const t = ((clock - r.born) / r.period) % 1.25;
      r.dot.visible = grown >= 1 && t <= 1 && !calm;
      if (r.dot.visible) {
        r.dot.position.copy(r.curve.getPoint(t));
        r.dot.scale.setScalar(Math.max(1, rig.r / 7));
      }
    }
    const beat = 1 + ((clock * 0.7) % 1) * 1.8;
    youRing.scale.set(beat, beat, beat);
    (youRing.material as THREE.MeshBasicMaterial).opacity = 1 - ((clock * 0.7) % 1);
    const youSize = rig.r * 0.05;
    youTag.sprite.scale.set(youSize * 5.33, youSize, 1);

    // Searchlights sweep; brighter after dark.
    for (const b of beams) {
      b.g.visible = pose === 'mood' || pose === 'time';
      b.cone.rotation.set(Math.sin(clock * 0.5 + b.i * 1.7) * 0.22, 0, Math.cos(clock * 0.4 + b.i * 2.3) * 0.22);
      (b.cone.material as THREE.MeshBasicMaterial).opacity = 0.05 + look.glow * 0.24;
    }

    // Beacons rise, breathe, and the chosen one stands taller.
    beacons.forEach((b, i) => {
      const grown = Math.min(1, (clock - b.born) * 1.6);
      const chosen = focused === null || focused === i;
      const h = (chosen ? 1 : 0.55) * grown;
      b.beam.scale.set(1, Math.max(0.001, h), 1);
      b.beam.position.y = h * 0.6;
      (b.beam.material as THREE.MeshBasicMaterial).opacity = chosen ? 0.75 : 0.35;
      const pulse = 1 + ((clock * 0.8 + i * 0.3) % 1) * 1.6;
      b.ring.scale.set(pulse, pulse, pulse);
      (b.ring.material as THREE.MeshBasicMaterial).opacity = (1 - ((clock * 0.8 + i * 0.3) % 1)) * 0.7 * grown;
      b.label.position.y = h * 1.2 + 0.26;
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
    stars.points.position.copy(camera.position);

    if (useLens) {
      lens.focus.value = probe.set(rig.tx, 0.15, rig.tz).project(camera).y * 0.5 + 0.5;
      // The wider the view, the gentler the blur: a whole county shouldn't go soft.
      lens.strength.value = Math.min(1, Math.max(0.3, 8 / rig.r));
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.render(lensScene, lensCamera);
      // One check, early: a device that can't fill the buffer shows pure black. Draw direct from then on.
      if (++frames === 4) {
        const gl = renderer.getContext();
        const px = new Uint8Array(4);
        let lit = 0;
        for (const [fx, fy] of [[0.5, 0.9], [0.2, 0.6], [0.8, 0.3], [0.5, 0.5]]) {
          gl.readPixels(Math.floor(gl.drawingBufferWidth * fx!), Math.floor(gl.drawingBufferHeight * fy!), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
          lit += px[0]! + px[1]! + px[2]!;
        }
        if (lit === 0) useLens = false;
      }
    } else {
      renderer.render(scene, camera);
    }
  };
  raf = requestAnimationFrame(frame);

  // ------------------------------------------------------------ the handle

  return {
    setSky(input) {
      sky = input;
      const snow = input.snowIn >= 1;
      const ground = snow ? '#e9eef1' : GROUND[input.month] ?? '#6f9a5b';
      landMat.color.set(ground);
      rimMat.color.set(ground);
      lawnMat.color.set(snow ? '#eef2f4' : input.month >= 4 && input.month <= 10 ? '#5c9153' : '#8a8f62');
      pitchMat.color.set(snow ? '#e3ebe6' : '#4f9a4a');
      roofMat.color.set(snow ? '#f4f6f7' : '#ffffff');
      shoreMat.color.set(snow ? '#f4f7f9' : '#d8c9a2');
      dress(input.month, snow);
      isFrozen = input.frozen;
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
      }
      focused = null;
      pinHits.length = 0;
      fresh = true;
      lastPins = pins;
      beacons = pins.map((p, i) => {
        const g = new THREE.Group();
        const pos = new THREE.Vector3(p.east, 0, -p.north);
        g.position.copy(pos);
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 1.2, 10, 1, true), new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.75, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.2, 28), new THREE.MeshBasicMaterial({ color: p.color, transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.03;
        const tag = label(i + 1, p.color);
        const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 2, 8), new THREE.MeshBasicMaterial({ visible: false }));
        hit.position.y = 0.9;
        hit.userData.tap = () => cb.onPin(i);
        g.userData.hit = hit;
        g.add(beam, ring, tag, hit);
        pinHits.push(hit);
        scene.add(g);
        return { g, beam, ring, label: tag, pos, born: clock + i * 0.25 };
      });
      layRoutes();
    },
    setHome(next) {
      home = next ? new THREE.Vector3(next.east, 0, -next.north) : null;
      layRoutes();
    },
    setLive(spots) {
      for (const b of beams) {
        scene.remove(b.g);
        const at = tappable.indexOf(b.hit);
        if (at >= 0) tappable.splice(at, 1);
      }
      beams = spots.map((s, i) => {
        const g = new THREE.Group();
        g.position.set(s.east, 0, -s.north);
        const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(s.color).lerp(new THREE.Color('#fff2cc'), 0.55), transparent: true, opacity: 0.1, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
        const lamp = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: s.color, fog: false }));
        lamp.position.y = 0.05;
        const hit = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), unseen());
        hit.position.y = 0.35;
        hit.userData.tap = () => say(s.label, new THREE.Vector3(s.east, 1.0, -s.north));
        g.add(cone, lamp, hit);
        g.visible = pose === 'mood' || pose === 'time';
        tappable.push(hit);
        scene.add(g);
        return { g, cone, hit, i };
      });
    },
    focus(index) {
      if (index !== null && index !== focused && !calm) {
        // A new deal gets a longer look at the whole map; a swipe gets a quick one.
        hop = fresh ? 2.6 : 1.0;
        fresh = false;
      }
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
      target.dispose();
      renderer.dispose();
    },
  };
}
