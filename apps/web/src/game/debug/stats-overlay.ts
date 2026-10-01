// Overlay + window.__miuStats: draw calls, triangles, FPS average over 1 s and the 5th-percentile
// FPS (the slow frames players feel), for humans on-device and for the Playwright perf run.
import type { WebGLRenderer } from 'three';

export interface MiuStats {
  quality: string;
  fpsAvg: number;
  fpsP5: number;
  calls: number;
  triangles: number;
  frames: number;
  loadMs: number;
  meshMs: number;
  worker: boolean;
  firstAreaBytes: number;
  ready: boolean;
  player: [number, number, number];
  onGround: boolean;
  /** Id of the target whose prompt is showing, if any. */
  nearTarget: string | null;
  /** Id of the last target the player interacted with. */
  lastInteraction: string | null;
  /** Target the direction arrow points at while it shows. */
  hintTarget: string | null;
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
  ambientLine: string | null;
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
    this.stats = { quality, fpsAvg: 0, fpsP5: 0, calls: 0, triangles: 0, frames: 0, loadMs: 0, meshMs: 0, worker: true, firstAreaBytes: 0, ready: false, player: [0, 0, 0], onGround: false, nearTarget: null, lastInteraction: null, hintTarget: null, cameraInsideBlock: false, cameraYaw: 0, outfit: [], ambientVisible: 0, ambientReactions: 0, ambientCelebrations: 0, confetti: false, ambientLine: null };
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
