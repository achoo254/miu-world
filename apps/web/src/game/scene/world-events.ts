// Surprises in the world while the child explores (Jev review decision "surprise events"): rain that clears
// into a rainbow, fireflies at dusk, an animal running over to say hello. Which ones a map plays is data
// (`events` in content/world/regions.json); this module plays them on any map. A scheduler starts one now
// and then (rotating, never the same twice in a row), never next to a quest target, never blocking or
// rewarding anything. Each visual is one draw call. Under reduced motion the rain does not fall and the
// fireflies hold still; on low quality the rain does not fall either. The sky still changes, gently.
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Points,
  PointsMaterial,
  RingGeometry,
  ShaderMaterial,
  BoxGeometry,
  CanvasTexture,
  type DirectionalLight,
  type Fog,
  type HemisphereLight,
  type Scene,
} from 'three';
import type { WorldEventKind } from '@miu/schema/region';
import { freshPicker } from '@miu/quest/pick-fresh';
import type { PlaceMood } from '@miu/voxel/world-entities';
import type { AmbientLife } from '../ambient/ambient-life';

type Player = { x: number; y: number; z: number };

export interface WorldEventContext {
  scene: Scene;
  /** The sky dome's own colours (uniforms), the fog and the lights the moods tint. */
  skyColours: { top: Color; horizon: Color };
  fog: Fog;
  hemisphere: HemisphereLight;
  sun: DirectionalLight;
  life: AmbientLife;
  reduced: boolean;
  /** Low quality: no falling rain (the sky still turns grey, the rainbow still shows). */
  lite: boolean;
  /** Where the camera looks, flat on the ground (unit x, z): the rainbow rises ahead of the child. */
  ahead(): { x: number; z: number };
  /** The map's places with a light of their own (`moods` in entities.json). */
  places?: ReadonlyArray<{ mood: PlaceMood; x0: number; z0: number; x1: number; z1: number }>;
}

export interface WorldEvents {
  /** Plays `kind` now (also the `?event=` review switch); false when it cannot (another is playing, no animal near). */
  start(kind: WorldEventKind, player: Player): boolean;
  update(dt: number, player: Player, questPrompt: boolean): void;
  readonly active: WorldEventKind | null;
  /** Events played so far. */
  readonly played: number;
  /**
   * Holds a light for review shots of the mocks' evening, night and cave frames (`?mood=dusk|night|cave`):
   * lanterns, crystals and lava glow against it.
   */
  holdMood(mood: 'dusk' | PlaceMood): void;
}

/** First surprise after this much play, then one every so often (seconds). */
const FIRST_AFTER: readonly [number, number] = [40, 70];
const GAP: readonly [number, number] = [100, 160];
/** Next to a quest target the surprise waits this long and tries again. */
const RETRY_SECONDS = 6;

interface Mood {
  top: Color;
  horizon: Color;
  hemisphere: number;
  sun: number;
  /** The colour the lights take on (lamplight's gold); the day's white when absent. */
  light?: Color;
}

const between = ([a, b]: readonly [number, number], random: () => number): number => a + (b - a) * random();
const smooth = (t: number): number => t * t * (3 - 2 * t);
/** 0 → 1 over [from, from + fade], held, then back to 0 over [to - fade, to]. */
const envelope = (t: number, from: number, to: number, fade: number): number =>
  t < from || t > to ? 0 : smooth(Math.min(1, (t - from) / fade, (to - t) / fade));

const RAIN_MOOD = { top: new Color('#8ea3b8'), horizon: new Color('#cfd6de'), hemisphere: 0.75, sun: 0.45 };
const DUSK_MOOD = { top: new Color('#3f4386'), horizon: new Color('#ffad7a'), hemisphere: 0.45, sun: 0.3 };
/**
 * A moonlit night (the island's night forest, d-13), the dim inside of a cave or a temple (d-08, d-09), the
 * child's home lit by its lamps (warm gold, a little dimmer than day so the lanterns glow) and the golden late
 * afternoon round it (the mock's warm light, panel 1).
 */
const PLACE_MOOD: Readonly<Record<PlaceMood, Mood>> = {
  night: { top: new Color('#0d1440'), horizon: new Color('#28366e'), hemisphere: 0.32, sun: 0.1 },
  cave: { top: new Color('#1b2233'), horizon: new Color('#2b3346'), hemisphere: 0.3, sun: 0.12 },
  warm: { top: new Color('#f3c58e'), horizon: new Color('#ffd9a6'), hemisphere: 0.82, sun: 0.6, light: new Color('#ffd9a8') },
  golden: { top: new Color('#8fc2f5'), horizon: new Color('#ffe0b0'), hemisphere: 1, sun: 1, light: new Color('#fff0d6') },
};
/** How fast a place's light eases in and out as the child walks in or out (weight per second). */
const PLACE_EASE = 1.2;

function createRain(): { mesh: InstancedMesh; place(player: Player, random: () => number): void; fall(dt: number, player: Player, random: () => number): void } {
  const DROPS = 420;
  const RADIUS = 14;
  const mesh = new InstancedMesh(new BoxGeometry(0.035, 0.7, 0.035), new MeshBasicMaterial({ color: '#d8e8ff', transparent: true, opacity: 0.6 }), DROPS);
  mesh.name = 'rain';
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.visible = false;
  const drops = Array.from({ length: DROPS }, () => ({ x: 0, y: 0, z: 0 }));
  const dummy = new Object3D();
  const reset = (d: (typeof drops)[number], player: Player, random: () => number, anyHeight: boolean): void => {
    const a = random() * Math.PI * 2;
    const r = Math.sqrt(random()) * RADIUS;
    d.x = player.x + Math.cos(a) * r;
    d.z = player.z + Math.sin(a) * r;
    d.y = player.y + (anyHeight ? random() * 14 : 12 + random() * 2);
  };
  const write = (): void => {
    drops.forEach((d, i) => {
      dummy.position.set(d.x, d.y, d.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  return {
    mesh,
    place(player, random) {
      for (const d of drops) reset(d, player, random, true);
      write();
    },
    fall(dt, player, random) {
      for (const d of drops) {
        d.y -= 18 * dt;
        if (d.y < player.y - 3 || Math.hypot(d.x - player.x, d.z - player.z) > RADIUS + 4) reset(d, player, random, false);
      }
      write();
    },
  };
}

/** The arch stands this far ahead with its feet a little below the child, both legs inside the view (blocks). */
const RAINBOW_INNER = 21;
const RAINBOW_OUTER = 25;
const RAINBOW_DISTANCE = 55;
const RAINBOW_DROP = 6;

/** A rainbow arch on the horizon: a half ring whose radius picks the band colour. */
function createRainbow(): { mesh: Mesh; opacity: { value: number } } {
  const opacity = { value: 0 };
  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: { opacity, inner: { value: RAINBOW_INNER }, outer: { value: RAINBOW_OUTER } },
    vertexShader: `varying float vR; void main() { vR = length(position.xy); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float opacity; uniform float inner; uniform float outer; varying float vR;
      void main() {
        float t = clamp((vR - inner) / (outer - inner), 0.0, 1.0);
        // Violet inside to red outside, six bands.
        vec3 colour = vec3(0.62, 0.42, 0.95);
        colour = mix(colour, vec3(0.32, 0.55, 1.0), step(1.0 / 6.0, t));
        colour = mix(colour, vec3(0.36, 0.82, 0.5), step(2.0 / 6.0, t));
        colour = mix(colour, vec3(1.0, 0.92, 0.35), step(3.0 / 6.0, t));
        colour = mix(colour, vec3(1.0, 0.65, 0.3), step(4.0 / 6.0, t));
        colour = mix(colour, vec3(1.0, 0.4, 0.45), step(5.0 / 6.0, t));
        float edge = smoothstep(0.0, 0.08, t) * smoothstep(1.0, 0.92, t);
        gl_FragColor = vec4(colour, opacity * edge * 0.75);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new Mesh(new RingGeometry(RAINBOW_INNER, RAINBOW_OUTER, 72, 1, 0, Math.PI), material);
  mesh.name = 'rainbow';
  mesh.visible = false;
  mesh.renderOrder = 1;
  return { mesh, opacity };
}

/** A soft round glow for the fireflies (drawn once on a small canvas, no image file). */
function glowDot(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const g = canvas.getContext('2d');
  if (!g) return null;
  const gradient = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.65)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gradient;
  g.fillRect(0, 0, 32, 32);
  return new CanvasTexture(canvas);
}

function createFireflies(): { points: Points; colours: BufferAttribute; positions: BufferAttribute } {
  const COUNT = 36;
  const geometry = new BufferGeometry();
  const positions = new BufferAttribute(new Float32Array(COUNT * 3), 3);
  const colours = new BufferAttribute(new Float32Array(COUNT * 3), 3);
  positions.setUsage(DynamicDrawUsage);
  colours.setUsage(DynamicDrawUsage);
  geometry.setAttribute('position', positions);
  geometry.setAttribute('color', colours);
  const points = new Points(geometry, new PointsMaterial({ size: 0.45, map: glowDot(), vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false }));
  points.name = 'fireflies';
  points.frustumCulled = false;
  points.visible = false;
  return { points, colours, positions };
}

export function createWorldEvents(kinds: readonly WorldEventKind[], ctx: WorldEventContext, random: () => number = Math.random): WorldEvents {
  const day: Mood = { top: ctx.skyColours.top.clone(), horizon: ctx.skyColours.horizon.clone(), hemisphere: ctx.hemisphere.intensity, sun: ctx.sun.intensity };
  const dayFog = ctx.fog.color.clone();
  const dayLight = { sky: ctx.hemisphere.color.clone(), sun: ctx.sun.color.clone() };
  const rain = createRain();
  const rainbow = createRainbow();
  const fireflies = createFireflies();
  ctx.scene.add(rain.mesh, rainbow.mesh, fireflies.points);
  const seeds = Array.from({ length: fireflies.positions.count }, () => ({ a: random() * 10, r: 1.5 + random() * 5, h: 0.4 + random() * 2.2, s: 0.3 + random() * 0.6 }));
  const glow = new Color('#d9ff6b');

  const picker = kinds.length > 0 ? freshPicker([...kinds], random) : null;
  let wait = between(FIRST_AFTER, random);
  let active: WorldEventKind | null = null;
  let t = 0;
  let length = 0;
  let played = 0;
  let anchor: Player = { x: 0, y: 0, z: 0 };

  const tint = (mood: Mood, w: number): void => {
    ctx.skyColours.top.copy(day.top).lerp(mood.top, w);
    ctx.skyColours.horizon.copy(day.horizon).lerp(mood.horizon, w);
    ctx.fog.color.copy(dayFog).lerp(mood.horizon, w);
    ctx.hemisphere.intensity = day.hemisphere + (mood.hemisphere * day.hemisphere - day.hemisphere) * w;
    ctx.sun.intensity = day.sun + (mood.sun * day.sun - day.sun) * w;
    ctx.hemisphere.color.copy(dayLight.sky);
    ctx.sun.color.copy(dayLight.sun);
    if (mood.light) {
      ctx.hemisphere.color.lerp(mood.light, w);
      ctx.sun.color.lerp(mood.light, w);
    }
  };
  const finish = (): void => {
    tint(RAIN_MOOD, 0);
    rain.mesh.visible = false;
    rainbow.mesh.visible = false;
    fireflies.points.visible = false;
    active = null;
    wait = between(GAP, random);
  };

  // The light of the place the child stands in, eased in and out; surprises wait while it shows.
  let held = false;
  let place: PlaceMood | null = null;
  let placeWeight = 0;
  const placeAt = (player: Player): PlaceMood | null =>
    ctx.places?.find((p) => player.x >= p.x0 && player.x <= p.x1 + 1 && player.z >= p.z0 && player.z <= p.z1 + 1)?.mood ?? null;
  const updatePlace = (dt: number, player: Player): void => {
    const here = placeAt(player);
    if (here) place = here;
    placeWeight = Math.min(1, Math.max(0, placeWeight + (here ? 1 : -1) * PLACE_EASE * dt));
    if (place) tint(PLACE_MOOD[place], placeWeight);
    if (placeWeight === 0) place = null;
  };

  const events: WorldEvents = {
    holdMood(mood) {
      held = true;
      tint(mood === 'dusk' ? DUSK_MOOD : PLACE_MOOD[mood], 1);
    },
    get active() {
      return active;
    },
    get played() {
      return played;
    },
    start(kind, player) {
      if (active) return false;
      if (kind === 'animal-visit' && !ctx.life.visit(player)) return false;
      active = kind;
      t = 0;
      played++;
      anchor = { ...player };
      length = kind === 'rain-rainbow' ? 24 : kind === 'fireflies' ? 24 : 8;
      if (kind === 'rain-rainbow') {
        if (!ctx.reduced && !ctx.lite) {
          rain.place(player, random);
          rain.mesh.visible = true;
        }
        // Over the horizon straight ahead, facing the child.
        const { x, z } = ctx.ahead();
        rainbow.mesh.position.set(player.x + x * RAINBOW_DISTANCE, player.y - RAINBOW_DROP, player.z + z * RAINBOW_DISTANCE);
        rainbow.mesh.lookAt(player.x, player.y - RAINBOW_DROP, player.z);
      }
      if (kind === 'fireflies') fireflies.points.visible = true;
      return true;
    },
    update(dt, player, questPrompt) {
      if (held) return;
      if (!active && (place || placeAt(player))) {
        updatePlace(dt, player);
        return;
      }
      if (!active) {
        if (!picker) return;
        wait -= dt;
        if (wait > 0) return;
        if (questPrompt) {
          wait = RETRY_SECONDS;
          return;
        }
        // An animal visit needs an animal near: otherwise the next surprise in line plays.
        const kind = picker.next();
        if (!events.start(kind, player)) wait = RETRY_SECONDS;
        return;
      }
      t += dt;
      if (active === 'rain-rainbow') {
        tint(RAIN_MOOD, envelope(t, 0, 15, 2.5));
        if (rain.mesh.visible) {
          rain.fall(dt, player, random);
          (rain.mesh.material as MeshBasicMaterial).opacity = 0.6 * envelope(t, 0, 14, 1.5);
          if (t > 14) rain.mesh.visible = false;
        }
        const show = envelope(t, 13, length, 2.5);
        rainbow.mesh.visible = show > 0;
        rainbow.opacity.value = show;
      } else if (active === 'fireflies') {
        const dusk = envelope(t, 0, length, 3);
        tint(DUSK_MOOD, dusk);
        seeds.forEach((s, i) => {
          const time = ctx.reduced ? s.a : s.a + t * s.s;
          fireflies.positions.setXYZ(i, anchor.x + Math.cos(time) * s.r, anchor.y + s.h + Math.sin(time * 1.7) * 0.4, anchor.z + Math.sin(time * 0.8) * s.r);
          const blink = ctx.reduced ? 1 : 0.35 + 0.65 * Math.max(0, Math.sin(t * 2.2 + s.a * 3));
          fireflies.colours.setXYZ(i, glow.r * blink * dusk, glow.g * blink * dusk, glow.b * blink * dusk);
        });
        fireflies.positions.needsUpdate = true;
        fireflies.colours.needsUpdate = true;
      }
      if (t >= length) finish();
    },
  };
  return events;
}
