// How the objects answer the child (Jev, 05/10/2026), drawn from each interaction's `effect`: a lit lamp glows
// (and the lit lamp nearest her lights the room: the one real light, never on the low quality), a television
// or computer shows moving colours, doors and lids swing open, a globe spins, a swing's seat swings with her,
// water runs, steam rises, little shapes float up. Switched effects follow object-states.ts; one-off ones play
// while she uses the object. Budget: the shapes and glows are two draw calls in all, a screen one each while
// on, a moving part one each (prop field), the light none.
import {
  Mesh,
  PlaneGeometry,
  PointLight,
  Quaternion,
  ShaderMaterial,
  Vector3,
  type Object3D,
} from 'three';
import type { CatalogModel } from '@miu/voxel/model-catalog';
import type { LiveProp, ModelInfo } from '../entities/props';
import type { QualityLevel } from '../quality';
import { createEffectLayers, type Halo, type ParticleShape } from './effect-particles';
import { toWorld, worldFacing, type Point } from './interaction-geometry';
import type { EffectsChannel } from './object-interaction-manager';
import { matchInteraction } from './object-interaction-registry';
import type { CandidateObject, ObjectEffect } from './object-interaction-types';
import type { ObjectStates } from './object-states';

export interface ObjectEffectsOptions {
  scene: Object3D;
  objects: readonly CandidateObject[];
  states: ObjectStates;
  props: { live(index: number): LiveProp | null; modelInfo(model: string): ModelInfo | undefined };
  catalog: (model: string) => CatalogModel | undefined;
  quality: QualityLevel;
  /** Less motion asked for: shapes drift slower, a globe turns slower. */
  reduced: boolean;
}

export interface ObjectEffectsStats {
  /** Lamps lit and other glows showing. */
  halos: number;
  screens: number;
  /** Doors, lids and flaps open (any part turned past a tenth of its way). */
  open: number;
  /** Little shapes, drops and puffs in the air now. */
  particles: number;
  /** One-off effects playing now. */
  playing: number;
  /** The shared lamp light is lighting the room. */
  light: boolean;
}

export interface ObjectEffects extends EffectsChannel {
  /** Each frame, with where she stands and how many pixels a block one unit away covers. */
  update(dt: number, player: { x: number; y: number; z: number }, pixelScale: number): void;
  stats(): ObjectEffectsStats;
  dispose(): void;
}

/** Seconds for a door or lid to swing all the way. */
const SWING_OPEN_S = 0.45;
/** The shared lamp light follows lit lamps this close to her (blocks). */
const LIGHT_REACH = 14;
const LIGHT_COLOR = 0xffd9a0;
const LIGHT_INTENSITY = 6;

const SCREEN_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
/** A cartoon on the television (sky, rolling hills, a bouncing sun), a page of lines and a cursor on a computer. */
const SCREEN_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uKind;
  varying vec2 vUv;
  void main() {
    vec2 uv = vUv;
    vec3 col;
    if (uKind < 0.5) {
      col = mix(vec3(0.35, 0.68, 1.0), vec3(0.65, 0.9, 1.0), uv.y);
      float hills = step(uv.y, 0.28 + 0.07 * sin(uv.x * 9.0 + uTime * 1.6));
      col = mix(col, vec3(0.42, 0.78, 0.36), hills);
      vec2 c = vec2(fract(uTime * 0.12) * 1.3 - 0.15, 0.55 + 0.18 * abs(sin(uTime * 2.4)));
      float d = length((uv - c) * vec2(1.7, 1.0));
      col = mix(col, vec3(1.0, 0.82, 0.25), smoothstep(0.13, 0.11, d));
    } else {
      col = vec3(0.16, 0.42, 0.78);
      float row = floor(uv.y * 8.0);
      float len = 0.35 + 0.5 * fract(sin(row * 12.9898) * 43758.5453);
      float line = step(0.25, fract(uv.y * 8.0)) * step(fract(uv.y * 8.0), 0.65) * step(0.08, uv.x) * step(uv.x, len);
      col = mix(col, vec3(0.92, 0.96, 1.0), line * step(row, mod(uTime * 2.0, 9.0)));
      float cursor = step(0.5, fract(uTime * 1.5)) * step(abs(uv.x - 0.1), 0.02) * step(abs(uv.y - 0.1), 0.04);
      col = mix(col, vec3(1.0), cursor);
    }
    col *= 0.93 + 0.07 * sin(uv.y * 140.0);
    gl_FragColor = vec4(col, 1.0);
  }
`;

const AXES: Record<string, Vector3> = { x: new Vector3(1, 0, 0), y: new Vector3(0, 1, 0), z: new Vector3(0, 0, 1) };
const SYMBOL_SHAPES = new Set<ParticleShape>(['heart', 'note', 'star', 'bubble', 'zzz', 'sparkle']);

interface Playing {
  object: CandidateObject;
  remaining: number;
  emit: number;
}

export function createObjectEffects(options: ObjectEffectsOptions): ObjectEffects {
  const { scene, objects, states, props, catalog, quality, reduced } = options;
  const lite = quality === 'low';
  const layers = createEffectLayers(lite ? 60 : 160);
  scene.add(layers.particles.points, layers.glow);
  const byKey = new Map<string, CandidateObject[]>();
  for (const o of objects) byKey.set(o.stateKey, [...(byKey.get(o.stateKey) ?? []), o]);
  const effectOf = (o: CandidateObject): ObjectEffect | undefined => o.def.effect;
  const placedOf = (o: CandidateObject) => ({ position: o.position, yaw: o.yaw, scale: o.scale });

  // Where each object's effect shows, worked out once: a lamp's bulb, the top of a pot, a tap's spout.
  const anchors = new Map<string, Point>();
  const anchor = (o: CandidateObject): Point => {
    const known = anchors.get(o.id);
    if (known) return known;
    const info = props.modelInfo(o.model);
    const b = info?.bounds;
    const top: Point = b ? [(b.min[0] + b.max[0]) / 2, b.max[1], (b.min[2] + b.max[2]) / 2] : [0, 1, 0];
    const kind = effectOf(o)?.kind;
    const local: Point =
      (kind === 'light' || kind === 'glow') && info?.glow
        ? info.glow
        : kind === 'light' || kind === 'glow'
          ? [top[0], (b?.min[1] ?? 0) + (top[1] - (b?.min[1] ?? 0)) * 0.85, top[2]]
          : top;
    const lift = kind === 'water' ? 0.45 : kind === 'symbols' ? 0.25 : 0.05;
    const world = toWorld(placedOf(o), local);
    const at: Point = [world[0], world[1] + lift, world[2]];
    anchors.set(o.id, at);
    return at;
  };

  // Screens: one plane each while on, sharing a material per kind.
  const screenMaterials = [0, 1].map(
    (kind) =>
      new ShaderMaterial({
        vertexShader: SCREEN_VERTEX,
        fragmentShader: SCREEN_FRAGMENT,
        uniforms: { uTime: { value: 0 }, uKind: { value: kind } },
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
  );
  const screens = new Map<string, Mesh>();
  const showScreen = (o: CandidateObject, on: boolean): void => {
    const existing = screens.get(o.id);
    if (!on) {
      if (existing) {
        scene.remove(existing);
        existing.geometry.dispose();
        screens.delete(o.id);
      }
      return;
    }
    if (existing) return;
    const entry = catalog(o.model);
    const info = props.modelInfo(o.model);
    const front = entry?.front ?? 0;
    // Without a catalogued screen: the upper middle of its front face.
    const b = info?.bounds;
    const screen = entry?.screen ?? {
      at: [b ? (b.min[0] + b.max[0]) / 2 : 0, b ? b.min[1] + (b.max[1] - b.min[1]) * 0.6 : 0.5, b ? (front === 180 ? b.min[2] - 0.01 : b.max[2] + 0.01) : 0] as [number, number, number],
      size: [b ? (b.max[0] - b.min[0]) * 0.6 : 0.5, b ? (b.max[1] - b.min[1]) * 0.4 : 0.3] as [number, number],
    };
    const material = screenMaterials[o.def.id.startsWith('computer') ? 1 : 0];
    const mesh = new Mesh(new PlaneGeometry(screen.size[0] * o.scale, screen.size[1] * o.scale), material);
    mesh.position.set(...toWorld(placedOf(o), screen.at));
    mesh.rotation.y = worldFacing(placedOf(o), front);
    mesh.name = `screen:${o.id}`;
    scene.add(mesh);
    screens.set(o.id, mesh);
  };

  // Halos round lit lamps and running glows, rebuilt when what is lit changes.
  const playing = new Map<string, Playing>();
  const rebuildHalos = (): void => {
    const halos: Halo[] = [];
    for (const o of objects) {
      const e = effectOf(o);
      if (e?.kind === 'light' && states.isOn(o.stateKey)) halos.push({ at: anchor(o), size: 1.6, color: e.color });
    }
    for (const p of playing.values()) {
      const e = effectOf(p.object);
      if (e?.kind === 'glow') halos.push({ at: anchor(p.object), size: 1.2, color: e.color, alpha: 0.5 });
    }
    layers.setHalos(halos);
  };

  // Doors, lids, flaps: how far open each is (0–1), eased toward its state.
  const hinged = objects.filter((o) => effectOf(o)?.kind === 'open' || effectOf(o)?.kind === 'door');
  const openness = new Map<string, number>();
  const moving = new Set<CandidateObject>();
  const turn = new Quaternion();
  const turnPart = (part: Object3D, angle: number): void => {
    const rest = part.userData.rest as Quaternion | undefined;
    const axis = AXES[String(part.userData.axis ?? 'y')] ?? AXES.y;
    if (!rest || !axis) return;
    part.quaternion.copy(rest).multiply(turn.setFromAxisAngle(axis, angle));
  };
  const applyOpen = (o: CandidateObject, k: number): void => {
    const live = props.live(o.propIndex);
    if (!live) return;
    for (const part of live.parts.values()) turnPart(part, ((Number(part.userData.angle) || 0) * Math.PI * k) / 180);
  };

  // Spinners: a fan switched on keeps turning; a globe turns while she spins it and slows to a stop.
  const spin = new Map<string, number>();

  // The one real light (not on the low quality, nor on a map without lamps): at the lit lamp nearest her. Added
  // once, so the scene's light count never changes (no shader rebuilt when a lamp is switched).
  const light = lite || !objects.some((o) => effectOf(o)?.kind === 'light') ? null : new PointLight(LIGHT_COLOR, 0, 9, 2);
  if (light) {
    light.name = 'effects:lamp-light';
    scene.add(light);
  }
  let lightOn = false;

  const refresh = (o: CandidateObject): void => {
    const e = effectOf(o);
    const on = states.isOn(o.stateKey);
    if (e?.kind === 'screen') showScreen(o, on);
    else if (e?.kind === 'light') rebuildHalos();
    else if (e?.kind === 'open' || e?.kind === 'door' || e?.kind === 'spin') moving.add(o);
  };
  for (const o of objects) if (effectOf(o)?.toggle && states.isOn(o.stateKey)) refresh(o);
  // Switched states: what was left on is shown at once (no swing of a door already open on arrival).
  for (const o of hinged) if (states.isOn(o.stateKey)) openness.set(o.id, 1);
  const unsubscribe = states.onChange((key) => {
    for (const o of byKey.get(key) ?? []) refresh(o);
  });

  const emit = (o: CandidateObject, e: ObjectEffect, dt: number, p: Playing): void => {
    const rate = (e.kind === 'water' ? 26 : e.kind === 'steam' ? 7 : 2.6) * (lite ? 0.4 : 1);
    p.emit += dt * rate;
    const [x, y, z] = anchor(o);
    const slow = reduced ? 0.5 : 1;
    while (p.emit >= 1) {
      p.emit -= 1;
      const jitter = (): number => (Math.random() - 0.5) * 0.18;
      if (e.kind === 'water') {
        layers.particles.spawn({ shape: 'drop', at: [x + jitter(), y, z + jitter()], velocity: [0, -0.4, 0], gravity: 9, life: 0.55, size: [0.12, 0.1], alpha: 0.9 });
      } else if (e.kind === 'steam') {
        layers.particles.spawn({ shape: 'puff', at: [x + jitter(), y, z + jitter()], velocity: [jitter(), 0.55 * slow, jitter()], life: 1.8, size: [0.25, 0.7], alpha: 0.55, sway: 0.3 });
      } else if (e.kind === 'symbols' && SYMBOL_SHAPES.has(e.glyph)) {
        layers.particles.spawn({ shape: e.glyph, at: [x + jitter() * 2, y, z + jitter() * 2], velocity: [0, 0.6 * slow, 0], life: 1.8, size: [0.32, 0.42], color: e.color, sway: 0.6 });
      }
    }
  };

  return {
    play(o, seconds) {
      playing.set(o.id, { object: o, remaining: seconds, emit: 1 });
      if (effectOf(o)?.kind === 'glow') rebuildHalos();
      if (effectOf(o)?.kind === 'spin') moving.add(o);
    },
    stop(o) {
      const p = playing.get(o.id);
      if (!p) return;
      playing.delete(o.id);
      if (effectOf(o)?.kind === 'glow') rebuildHalos();
    },
    swing(o, part, angle) {
      const piece = props.live(o.propIndex)?.parts.get(part);
      if (piece) turnPart(piece, angle);
    },
    update(dt, player, pixelScale) {
      layers.setScale(pixelScale);
      for (const m of screenMaterials) {
        const time = m.uniforms.uTime;
        if (time) time.value += dt;
      }
      // One-off effects: give off their shapes, then end.
      let haloChange = false;
      for (const [id, p] of playing) {
        p.remaining -= dt;
        const e = effectOf(p.object);
        if (p.remaining <= 0) {
          playing.delete(id);
          if (e?.kind === 'glow') haloChange = true;
          continue;
        }
        if (e) emit(p.object, e, dt, p);
      }
      if (haloChange) rebuildHalos();
      // Doors and lids ease toward their state; spinners turn.
      for (const o of moving) {
        const e = effectOf(o);
        if (e?.kind === 'open' || e?.kind === 'door') {
          const target = states.isOn(o.stateKey) ? 1 : 0;
          const now = openness.get(o.id) ?? 0;
          const next = now + Math.sign(target - now) * Math.min(Math.abs(target - now), dt / SWING_OPEN_S);
          openness.set(o.id, next);
          applyOpen(o, next * next * (3 - 2 * next));
          if (next === target) moving.delete(o);
        } else if (e?.kind === 'spin') {
          const switchedOn = e.toggle && states.isOn(o.stateKey);
          const spun = playing.has(o.id);
          const speed = spin.get(o.id) ?? 0;
          const target = switchedOn || spun ? (reduced ? 2 : 6) : 0;
          const next = speed + (target - speed) * Math.min(1, dt * (target > speed ? 3 : 1.2));
          spin.set(o.id, next);
          const spinner = props.live(o.propIndex)?.spinner;
          if (spinner) spinner.rotation.y += next * dt;
          if (target === 0 && next < 0.02) moving.delete(o);
        }
      }
      // Doors drawn again when their tile is built anew (a tile dropped and rebuilt starts closed).
      for (const o of hinged) if (!moving.has(o) && (openness.get(o.id) ?? 0) > 0) applyOpen(o, 1);
      layers.update(dt);
      // The shared light at the nearest lit lamp.
      if (light) {
        let best: Point | null = null;
        let bestD = LIGHT_REACH;
        for (const o of objects) {
          if (effectOf(o)?.kind !== 'light' || !states.isOn(o.stateKey)) continue;
          const at = anchor(o);
          const d = Math.hypot(at[0] - player.x, at[1] - player.y, at[2] - player.z);
          if (d < bestD) {
            bestD = d;
            best = at;
          }
        }
        if (best) light.position.set(best[0], best[1] - 0.15, best[2]);
        const target = best ? LIGHT_INTENSITY : 0;
        light.intensity += (target - light.intensity) * Math.min(1, dt * 4);
        lightOn = light.intensity > 0.05;
      }
    },
    stats() {
      let open = 0;
      for (const k of openness.values()) if (k > 0.1) open++;
      return { halos: layers.halos, screens: screens.size, open, particles: layers.particles.count, playing: playing.size, light: lightOn };
    },
    dispose() {
      unsubscribe();
      scene.remove(layers.particles.points, layers.glow);
      layers.dispose();
      for (const mesh of screens.values()) {
        scene.remove(mesh);
        mesh.geometry.dispose();
      }
      screens.clear();
      for (const m of screenMaterials) m.dispose();
      if (light) scene.remove(light);
    },
  };
}

/** Indices of the map's props drawn whole on their own because their effect turns them (a globe, a fan). */
export function spinningProps(props: ReadonlyArray<{ model: string; slot?: string }>): Set<number> {
  const out = new Set<number>();
  for (const [i, p] of props.entries()) if (matchInteraction(p.model, p.slot)?.effect?.kind === 'spin') out.add(i);
  return out;
}
