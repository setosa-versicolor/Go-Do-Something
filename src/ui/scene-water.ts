// Ripples, simulated. The lakes are a grid of water heights on the graphics
// card, stepped sixty times a second by the wave equation: each cell is pulled
// toward the average of its neighbours, so a disturbance spreads as a ring,
// rings pass through each other, and they bounce off the shore. Boats disturb
// it by pushing water up at the bow and letting it drop at the stern; a tap or
// a raindrop is a single dab. The water's own shader reads the heights back
// and tilts its surface to match, so the sky and the sun reflect off real waves.
//
// One honest shortcut. On real water long waves outrun short ones, and that is
// what gives a wake its fixed V. Simulating that is too heavy for a phone, so
// there are two fields with two speeds: a slow one that a moving hull trails a
// wake through, and a fast one for the rings from a tap, a raindrop or a
// spinning boat. They are stepped together and drawn as one surface.

import * as THREE from 'three';

export interface Dab {
  /** Scene coordinates: x is east, z is south. */
  x: number;
  z: number;
  /** How much water to add (or, negative, take away) in the slow field and the fast one. */
  slow: number;
  fast: number;
  /** Size of the dab, in grid cells. */
  cells: number;
}

export interface Ripples {
  /** The current heights: slow field in red, fast in blue. Changes every step, so read it each frame. */
  texture: THREE.Texture;
  /** Miles across (the grid is square, centered on the city center), and the size of one cell as a fraction of that. */
  span: number;
  cell: number;
  /** Advance by `dt` seconds, applying this frame's disturbances at every step. */
  step(dt: number, dabs: Dab[]): void;
  /** A one-off: a tap, a raindrop. */
  drop(x: number, z: number, strength: number): void;
  dispose(): void;
}

const MAX_DABS = 96;
const STEPS_PER_SECOND = 60;
/** Miles a second. The slow field must be slower than a sailboat (about 0.04) or no wake forms behind it. */
const SLOW = 0.013;
const FAST = 0.1;

/** Null if this device can't render to a floating-point texture: the lakes then simply stay as they were. */
export function createRipples(renderer: THREE.WebGLRenderer, lakes: number[][], span: number, size: number): Ripples | null {
  if (!renderer.extensions.has('EXT_color_buffer_half_float') && !renderer.extensions.has('EXT_color_buffer_float')) return null;

  const make = () => new THREE.WebGLRenderTarget(size, size, {
    type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false, stencilBuffer: false,
    minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping,
  });
  let now = make();
  let next = make();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  // Scene coordinates straight to the grid: the center of the city is the middle of the texture.
  const toGrid = `gl_Position = vec4(position.x / ${(span / 2).toFixed(4)}, position.z / ${(span / 2).toFixed(4)}, 0.0, 1.0);`;

  // Where there is water: the lakes, drawn once from above. Waves stop at the shore and bounce.
  const mask = new THREE.WebGLRenderTarget(size, size, { depthBuffer: false, stencilBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  {
    const scene = new THREE.Scene();
    const mat = new THREE.ShaderMaterial({ vertexShader: `void main(){ ${toGrid} }`, fragmentShader: 'void main(){ gl_FragColor = vec4(1.0); }', side: THREE.DoubleSide, depthTest: false });
    for (const outline of lakes) {
      const s = new THREE.Shape();
      for (let i = 0; i < outline.length; i += 2) (i === 0 ? s.moveTo : s.lineTo).call(s, outline[i]!, outline[i + 1]!);
      const g = new THREE.ShapeGeometry(s);
      g.rotateX(-Math.PI / 2); // east, north → x, -z, as everywhere else in the model
      const m = new THREE.Mesh(g, mat);
      m.frustumCulled = false;
      scene.add(m);
    }
    const was = renderer.getRenderTarget();
    const wasColor = renderer.getClearColor(new THREE.Color());
    const wasAlpha = renderer.getClearAlpha();
    renderer.setRenderTarget(mask);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(was);
    renderer.setClearColor(wasColor, wasAlpha);
    scene.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    mat.dispose();
  }

  // One step of the wave equation, for both fields at once. Heights in red and blue, their rates of change in green and alpha.
  const cellMiles = span / size;
  const perStep = (milesPerSecond: number) => (milesPerSecond / cellMiles / STEPS_PER_SECOND) ** 2;
  const stepUniforms = {
    prev: { value: now.texture as THREE.Texture }, mask: { value: mask.texture }, px: { value: 1 / size },
    c2: { value: new THREE.Vector2(perStep(SLOW), Math.min(0.45, perStep(FAST))) },
    // How much of a wave survives each step: the wake lingers, the rings die away within a couple of seconds.
    keep: { value: new THREE.Vector2(0.9958, 0.989) },
  };
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: stepUniforms, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `uniform sampler2D prev; uniform sampler2D mask; uniform float px; uniform vec2 c2; uniform vec2 keep; varying vec2 vUv;
      void main(){
        vec4 s = texture2D(prev, vUv);
        vec2 around = texture2D(prev, vUv + vec2(px, 0.0)).rb + texture2D(prev, vUv - vec2(px, 0.0)).rb + texture2D(prev, vUv + vec2(0.0, px)).rb + texture2D(prev, vUv - vec2(0.0, px)).rb;
        vec2 h = s.rb;
        vec2 v = (s.ga + c2 * (around - 4.0 * h)) * keep;
        h = (h + v) * 0.9992;
        float water = smoothstep(0.35, 0.65, texture2D(mask, vUv).r);
        gl_FragColor = vec4(h.x, v.x, h.y, v.y) * water;
      }`,
  }));
  quad.frustumCulled = false;
  const stepScene = new THREE.Scene();
  stepScene.add(quad);

  // Disturbances: soft round dabs, added on top of the heights.
  const dabPos = new Float32Array(MAX_DABS * 3);
  const dabAmt = new Float32Array(MAX_DABS * 3);
  const dabGeo = new THREE.BufferGeometry();
  dabGeo.setAttribute('position', new THREE.BufferAttribute(dabPos, 3));
  dabGeo.setAttribute('amount', new THREE.BufferAttribute(dabAmt, 3));
  const dabs = new THREE.Points(dabGeo, new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false, transparent: true,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    blendEquationAlpha: THREE.AddEquation, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
    vertexShader: `attribute vec3 amount; varying vec2 vAmount;
      void main(){ vAmount = amount.xy; ${toGrid} gl_PointSize = amount.z; }`,
    fragmentShader: `varying vec2 vAmount;
      void main(){ vec2 d = gl_PointCoord - 0.5; float g = exp(-dot(d, d) * 18.0) - 0.011;
        gl_FragColor = vec4(vAmount.x * g, 0.0, vAmount.y * g, 0.0); }`,
  }));
  dabs.frustumCulled = false;
  const dabScene = new THREE.Scene();
  dabScene.add(dabs);

  const pending: Dab[] = [];
  let before: Dab[] = [];
  let owed = 0;

  const ripples: Ripples = {
    texture: now.texture,
    span,
    cell: 1 / size,
    step(dt, frameDabs) {
      owed = Math.min(4, owed + dt * STEPS_PER_SECOND);
      const steps = Math.floor(owed);
      if (steps === 0) return;
      owed -= steps;
      // Between frames a boat has moved on. Spread its push along the way it came, one dab per step,
      // so a slow frame leaves a smooth wake and not a row of dots.
      const moving = frameDabs.slice(0, MAX_DABS - 24);
      const from = before.length === moving.length ? before : moving;
      const drops = pending.slice(0, 24);
      const was = renderer.getRenderTarget();
      const auto = renderer.autoClear;
      for (let i = 0; i < steps; i++) {
        stepUniforms.prev.value = now.texture;
        renderer.autoClear = true;
        renderer.setRenderTarget(next);
        renderer.render(stepScene, camera);
        const t = (i + 1) / steps;
        const all = i === 0 ? [...moving, ...drops] : moving;
        all.forEach((d, k) => {
          const a = k < moving.length ? from[k]! : d;
          dabPos.set([a.x + (d.x - a.x) * t, 0, a.z + (d.z - a.z) * t], k * 3);
          dabAmt.set([d.slow, d.fast, Math.max(3, d.cells * 2.6)], k * 3);
        });
        if (all.length) {
          dabGeo.setDrawRange(0, all.length);
          dabGeo.attributes.position!.needsUpdate = true;
          dabGeo.attributes.amount!.needsUpdate = true;
          renderer.autoClear = false;
          renderer.render(dabScene, camera);
        }
        [now, next] = [next, now];
      }
      before = moving;
      pending.length = 0;
      renderer.autoClear = auto;
      renderer.setRenderTarget(was);
      ripples.texture = now.texture;
    },
    drop(x, z, strength) {
      if (pending.length < 24) pending.push({ x, z, slow: 0, fast: strength, cells: 2.4 });
    },
    dispose() {
      now.dispose();
      next.dispose();
      mask.dispose();
      dabGeo.dispose();
      (dabs.material as THREE.Material).dispose();
      (quad.material as THREE.Material).dispose();
      quad.geometry.dispose();
    },
  };
  return ripples;
}
