// The little things the objects give off when used (water drops, steam, hearts, notes, stars...) and the soft
// glow round a lit lamp: two point layers over one glyph atlas drawn in code, so every effect of the map costs
// two draw calls whatever is going on. Shapes are white and tinted per point.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  NormalBlending,
  Points,
  ShaderMaterial,
  type ColorRepresentation,
} from 'three';
import type { EffectGlyph } from './object-interaction-types';

export type ParticleShape = EffectGlyph | 'puff' | 'drop' | 'halo';

/** The atlas cell of each shape (the order they are drawn in). */
const CELLS: Record<ParticleShape, number> = { heart: 0, note: 1, star: 2, bubble: 3, zzz: 4, sparkle: 5, puff: 6, drop: 7, halo: 8 };
const CELL_COUNT = 16;
const CELL_PX = 64;

const VERTEX = /* glsl */ `
  attribute float size;
  attribute float alpha;
  attribute float cell;
  attribute vec3 tint;
  uniform float uScale;
  varying float vAlpha;
  varying float vCell;
  varying vec3 vTint;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = size * uScale / max(0.1, -mv.z);
    vAlpha = alpha;
    vCell = cell;
    vTint = tint;
  }
`;
const FRAGMENT = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform float uCells;
  varying float vAlpha;
  varying float vCell;
  varying vec3 vTint;
  void main() {
    vec2 uv = vec2((vCell + gl_PointCoord.x) / uCells, 1.0 - gl_PointCoord.y);
    vec4 c = texture2D(uAtlas, uv);
    float a = c.a * vAlpha;
    if (a < 0.02) discard;
    gl_FragColor = vec4(c.rgb * vTint, a);
  }
`;

/** The glyphs drawn white on a transparent strip, one cell each. */
function drawAtlas(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = CELL_PX * CELL_COUNT;
  canvas.height = CELL_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d canvas unavailable');
  const s = CELL_PX;
  const at = (cell: number): void => {
    ctx.setTransform(1, 0, 0, 1, cell * s, 0);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
  };
  // Heart.
  at(CELLS.heart);
  ctx.beginPath();
  ctx.moveTo(32, 54);
  ctx.bezierCurveTo(6, 36, 8, 12, 22, 12);
  ctx.bezierCurveTo(28, 12, 31, 16, 32, 20);
  ctx.bezierCurveTo(33, 16, 36, 12, 42, 12);
  ctx.bezierCurveTo(56, 12, 58, 36, 32, 54);
  ctx.fill();
  // Note: a head and a stem with a flag.
  at(CELLS.note);
  ctx.beginPath();
  ctx.ellipse(24, 46, 10, 7, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(31, 10, 5, 36);
  ctx.beginPath();
  ctx.moveTo(36, 10);
  ctx.quadraticCurveTo(52, 16, 48, 30);
  ctx.quadraticCurveTo(46, 22, 36, 20);
  ctx.fill();
  // Star.
  at(CELLS.star);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 26 : 11;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    ctx.lineTo(32 + Math.cos(a) * r, 33 + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  // Bubble: a ring with a shine.
  at(CELLS.bubble);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(32, 32, 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(25, 25, 5, 0, Math.PI * 2);
  ctx.fill();
  // Zzz.
  at(CELLS.zzz);
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Z', 32, 34);
  // Sparkle: a four-pointed twinkle.
  at(CELLS.sparkle);
  ctx.beginPath();
  ctx.moveTo(32, 4);
  ctx.quadraticCurveTo(36, 28, 60, 32);
  ctx.quadraticCurveTo(36, 36, 32, 60);
  ctx.quadraticCurveTo(28, 36, 4, 32);
  ctx.quadraticCurveTo(28, 28, 32, 4);
  ctx.fill();
  // Puff (steam) and halo (lamp glow): soft round falloffs.
  for (const [cell, inner] of [[CELLS.puff, 0.35], [CELLS.halo, 0.05]] as const) {
    at(cell);
    const g = ctx.createRadialGradient(32, 32, 32 * inner, 32, 32, 31);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }
  // Drop.
  at(CELLS.drop);
  ctx.beginPath();
  ctx.moveTo(32, 8);
  ctx.quadraticCurveTo(48, 34, 44, 44);
  ctx.arc(32, 42, 12, 0, Math.PI);
  ctx.quadraticCurveTo(16, 34, 32, 8);
  ctx.fill();
  const texture = new CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const DEFAULT_TINT: Record<ParticleShape, string> = {
  heart: '#ff6f9c',
  note: '#8e6bd6',
  star: '#ffd23f',
  bubble: '#bfe8ff',
  zzz: '#a9c4ff',
  sparkle: '#fff2a8',
  puff: '#ffffff',
  drop: '#5fb8ff',
  halo: '#ffd27a',
};

export interface ParticleSpawn {
  shape: ParticleShape;
  at: readonly [number, number, number];
  velocity: readonly [number, number, number];
  /** Seconds it lives. */
  life: number;
  /** World size at the start and the end of its life (blocks). */
  size: readonly [number, number];
  color?: ColorRepresentation;
  /** Pulled down (water) instead of floating up. */
  gravity?: number;
  /** Sways side to side while it rises (symbols). */
  sway?: number;
  alpha?: number;
}

interface Live extends ParticleSpawn {
  age: number;
  phase: number;
  pos: [number, number, number];
  rgb: Color;
}

export interface ParticleLayer {
  points: Points;
  spawn(p: ParticleSpawn): void;
  update(dt: number): void;
  /** Points alive now. */
  readonly count: number;
  setScale(pixelsPerBlockAtUnitDistance: number): void;
  dispose(): void;
}

function createLayer(atlas: CanvasTexture, capacity: number, additive: boolean): ParticleLayer {
  const geometry = new BufferGeometry();
  const position = new BufferAttribute(new Float32Array(capacity * 3), 3);
  const size = new BufferAttribute(new Float32Array(capacity), 1);
  const alpha = new BufferAttribute(new Float32Array(capacity), 1);
  const cell = new BufferAttribute(new Float32Array(capacity), 1);
  const tint = new BufferAttribute(new Float32Array(capacity * 3), 3);
  geometry.setAttribute('position', position);
  geometry.setAttribute('size', size);
  geometry.setAttribute('alpha', alpha);
  geometry.setAttribute('cell', cell);
  geometry.setAttribute('tint', tint);
  geometry.setDrawRange(0, 0);
  const scale = { value: 600 };
  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { uAtlas: { value: atlas }, uCells: { value: CELL_COUNT }, uScale: scale },
    transparent: true,
    depthWrite: false,
    blending: additive ? AdditiveBlending : NormalBlending,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 2;
  points.name = additive ? 'effects:glow' : 'effects:particles';
  const live: Live[] = [];
  const write = (): void => {
    for (let i = 0; i < live.length; i++) {
      const p = live[i];
      if (!p) continue;
      const k = Math.min(1, p.age / p.life);
      position.setXYZ(i, p.pos[0], p.pos[1], p.pos[2]);
      size.setX(i, p.size[0] + (p.size[1] - p.size[0]) * k);
      // Fade in quickly, out over the last third.
      const fade = Math.min(1, p.age / 0.15) * Math.min(1, (1 - k) / 0.35);
      alpha.setX(i, (p.alpha ?? 1) * fade);
      cell.setX(i, CELLS[p.shape]);
      tint.setXYZ(i, p.rgb.r, p.rgb.g, p.rgb.b);
    }
    geometry.setDrawRange(0, live.length);
    for (const a of [position, size, alpha, cell, tint]) a.needsUpdate = true;
  };
  return {
    points,
    spawn(p) {
      if (live.length >= capacity) live.shift();
      live.push({ ...p, age: 0, phase: Math.random() * Math.PI * 2, pos: [p.at[0], p.at[1], p.at[2]], rgb: new Color(p.color ?? DEFAULT_TINT[p.shape]) });
    },
    update(dt) {
      for (let i = live.length - 1; i >= 0; i--) {
        const p = live[i];
        if (!p) continue;
        p.age += dt;
        if (p.age >= p.life) {
          live.splice(i, 1);
          continue;
        }
        const sway = p.sway ? Math.sin(p.age * 4 + p.phase) * p.sway * dt : 0;
        p.pos[0] += p.velocity[0] * dt + sway;
        p.pos[1] += (p.velocity[1] - (p.gravity ?? 0) * p.age) * dt;
        p.pos[2] += p.velocity[2] * dt;
      }
      write();
    },
    get count() {
      return live.length;
    },
    setScale(next) {
      scale.value = next;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

/** A halo that stays (a lit lamp): drawn every frame until removed. */
export interface Halo {
  at: readonly [number, number, number];
  size: number;
  color?: ColorRepresentation;
  alpha?: number;
}

/** A halo with its colour read once (not every frame). */
interface ShownHalo extends Halo {
  rgb: Color;
}

export interface EffectLayers {
  particles: ParticleLayer;
  /** Steady halos (lit lamps, a running microwave): replaced as a whole when what is lit changes. */
  setHalos(halos: readonly Halo[]): void;
  readonly halos: number;
  readonly glow: Points;
  update(dt: number): void;
  setScale(scale: number): void;
  dispose(): void;
}

export function createEffectLayers(capacity: number): EffectLayers {
  const atlas = drawAtlas();
  const particles = createLayer(atlas, capacity, false);
  const glowLayer = createLayer(atlas, 64, true);
  let halos: readonly ShownHalo[] = [];
  let pulse = 0;
  return {
    particles,
    glow: glowLayer.points,
    setHalos(next) {
      halos = next.map((h) => ({ ...h, rgb: new Color(h.color ?? DEFAULT_TINT.halo) }));
    },
    get halos() {
      return halos.length;
    },
    update(dt) {
      particles.update(dt);
      // Halos are re-laid each frame as points that never age, breathing a little.
      pulse += dt;
      const breathe = 1 + Math.sin(pulse * 2.2) * 0.04;
      const geometry = glowLayer.points.geometry;
      const position = geometry.getAttribute('position') as BufferAttribute;
      const size = geometry.getAttribute('size') as BufferAttribute;
      const alpha = geometry.getAttribute('alpha') as BufferAttribute;
      const cell = geometry.getAttribute('cell') as BufferAttribute;
      const tint = geometry.getAttribute('tint') as BufferAttribute;
      const n = Math.min(halos.length, position.count);
      for (let i = 0; i < n; i++) {
        const h = halos[i];
        if (!h) continue;
        position.setXYZ(i, h.at[0], h.at[1], h.at[2]);
        size.setX(i, h.size * breathe);
        alpha.setX(i, h.alpha ?? 0.6);
        cell.setX(i, CELLS.halo);
        tint.setXYZ(i, h.rgb.r, h.rgb.g, h.rgb.b);
      }
      geometry.setDrawRange(0, n);
      for (const a of [position, size, alpha, cell, tint]) a.needsUpdate = true;
    },
    setScale(scale) {
      particles.setScale(scale);
      glowLayer.setScale(scale);
    },
    dispose() {
      particles.dispose();
      glowLayer.dispose();
      atlas.dispose();
    },
  };
}
