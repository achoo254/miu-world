// Overlay + window.__miuStats: draw calls, triangles, FPS average over 1 s and the 5th-percentile
// FPS (the slow frames players feel), for humans on-device and for the Playwright perf run.
import type { WebGLRenderer } from 'three';
import type { AutowalkState } from '../../game-bridge/game-store';
import type { PoseSample } from '../entities/player-character';
import type { ObjectsStats } from '../interact/object-tour';

export interface MiuStats {
  quality: string;
  fpsAvg: number;
  fpsP5: number;
  calls: number;
  triangles: number;
  frames: number;
  loadMs: number;
  /** Milliseconds from the start of this game's boot to each of its milestones (the first frame is `ready`). */
  boot: Record<string, number>;
  meshMs: number;
  worker: boolean;
  firstAreaBytes: number;
  ready: boolean;
  player: [number, number, number];
  onGround: boolean;
  /** Horizontal speed of the last frame (blocks per second). */
  speed: number;
  /** On the equipped vehicle. */
  riding: boolean;
  /** On one of the map's rides (ride/ride-journey.ts): its vehicle and the part of the trip, else null. */
  journey: { kind: string; phase: string } | null;
  /** Patches of land drawn round the camera now. */
  patches: number;
  /** Portals whose sparks swirl on this map. */
  portals: number;
  /** Id of the target whose prompt is showing, if any. */
  nearTarget: string | null;
  /** Id of the last target the player interacted with. */
  lastInteraction: string | null;
  /** Target the direction arrow points at while it shows. */
  hintTarget: string | null;
  /** Walking to the quest target on her own (the quest card): idle, finding, walking, arrived or failed. */
  autowalk: AutowalkState;
  /** Characters standing at another place of the story right now (castHidden), sorted. */
  castHidden: string[];
  /** True when the camera sits inside a solid block (must never happen). */
  cameraInsideBlock: boolean;
  cameraYaw: number;
  /** Accessories attached to the player character. */
  outfit: string[];
  /** Ambient villagers and animals drawn now, taps on them so far, and the last line one said. */
  ambientVisible: number;
  ambientReactions: number;
  /** Villagers and animals that joined a quest celebration so far. */
  ambientCelebrations: number;
  /** Confetti is flying. */
  confetti: boolean;
  /** The surprise playing now, if any, and how many have played. */
  worldEvent: string | null;
  worldEvents: number;
  /** The pet following the character, and what it is doing (idle, walk, run, dance). */
  pet: string | null;
  petClip: string | null;
  ambientLine: string | null;
  /** Other players and companion bots drawn now, as they are dressed (online). */
  remotePlayers: RemoteSummary[];
  /** The interaction with furniture or a prop last started (its id), and the one whose prompt shows. */
  lastObject: string | null;
  nearObject: string | null;
  /** The interactions now: what she is doing, where her body is, what is switched on and showing. */
  objects: ObjectsStats | null;
  /** Her arms, head and tilt as last posed (the gesture over her clip). */
  pose: PoseSample | null;
  /** Her body overlaps a solid block where she stands (never meant to happen, seated or not). */
  embedded: boolean;
}

export interface RemoteSummary {
  id: string;
  name: string;
  isBot: boolean;
  species: string;
  outfit: string[];
  pet: string | null;
  partyMate: boolean;
}

declare global {
  interface Window {
    __miuStats?: MiuStats;
  }
}

const WINDOW_SECONDS = 1;

export class StatsOverlay {
  private readonly frameTimes: number[] = [];
  private acc = 0;
  readonly stats: MiuStats;

  constructor(private readonly el: HTMLElement, quality: string) {
    this.stats = { quality, fpsAvg: 0, fpsP5: 0, calls: 0, triangles: 0, frames: 0, loadMs: 0, boot: {}, meshMs: 0, worker: true, firstAreaBytes: 0, ready: false, player: [0, 0, 0], onGround: false, speed: 0, riding: false, journey: null, patches: 0, portals: 0, nearTarget: null, lastInteraction: null, hintTarget: null, autowalk: 'idle', castHidden: [], cameraInsideBlock: false, cameraYaw: 0, outfit: [], ambientVisible: 0, ambientReactions: 0, ambientCelebrations: 0, confetti: false, worldEvent: null, worldEvents: 0, pet: null, petClip: null, ambientLine: null, remotePlayers: [], lastObject: null, nearObject: null, objects: null, pose: null, embedded: false };
    window.__miuStats = this.stats;
  }

  /** Drops the global handle when the game is disposed (unless a newer game replaced it). */
  detach(): void {
    if (window.__miuStats === this.stats) delete window.__miuStats;
  }

  frame(dt: number, renderer: WebGLRenderer): void {
    this.stats.frames++;
    this.stats.calls = renderer.info.render.calls;
    this.stats.triangles = renderer.info.render.triangles;
    this.frameTimes.push(dt);
    this.acc += dt;
    if (this.acc < WINDOW_SECONDS) return;
    const total = this.frameTimes.reduce((s, t) => s + t, 0);
    const sorted = [...this.frameTimes].sort((a, b) => b - a); // slowest first
    const p5Frame = sorted[Math.floor(sorted.length * 0.05)] ?? sorted[0] ?? 1;
    this.stats.fpsAvg = +(this.frameTimes.length / total).toFixed(1);
    this.stats.fpsP5 = +(1 / p5Frame).toFixed(1);
    this.frameTimes.length = 0;
    this.acc = 0;
    this.el.textContent =
      `${this.stats.quality.toUpperCase()} · ${this.stats.fpsAvg} fps (p5 ${this.stats.fpsP5})\n` +
      `calls ${this.stats.calls} · tris ${(this.stats.triangles / 1000).toFixed(1)}k\n` +
      `load ${(this.stats.loadMs / 1000).toFixed(1)}s · world ${(this.stats.firstAreaBytes / 1024 / 1024).toFixed(2)} MB`;
  }
}
