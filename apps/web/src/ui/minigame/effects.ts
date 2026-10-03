// What makes every game feel alive, the same way in all of them: each game event becomes particles, a
// floating "+n", a little screen shake and a sound. Drawn over the game, in arena units. Under reduced
// motion: no shake, fewer particles, and the "+n" fades where it is instead of floating up.
import { paintLabel } from './draw-kit';
import type { SoundCue } from '../sound/cues';
import type { DrawView, GameEvent } from './types';
import type { Theme } from './theme';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  colour: string;
}

interface Pop {
  x: number;
  y: number;
  text: string;
  life: number;
}

const POP_SECONDS = 0.8;
const SHAKE_SECONDS = 0.3;

/** The sound of each event (none for a miss: losing something is not punished with a noise). */
export const EVENT_SOUNDS: Readonly<Record<GameEvent['type'], SoundCue | null>> = { score: 'star', hit: 'wrong', action: 'tap', miss: null };

export class Effects {
  private particles: Particle[] = [];
  private pops: Pop[] = [];
  private shake = 0;

  constructor(
    private readonly theme: Theme,
    private readonly reducedMotion: boolean,
    private readonly random: () => number = Math.random,
  ) {}

  private burst(x: number, y: number, count: number, colours: readonly string[], speed: number, size: number): void {
    const n = this.reducedMotion ? Math.ceil(count / 2) : count;
    for (let i = 0; i < n; i += 1) {
      const angle = this.random() * Math.PI * 2;
      const v = speed * (0.4 + this.random() * 0.6);
      const max = 0.4 + this.random() * 0.4;
      this.particles.push({ x, y, vx: Math.cos(angle) * v, vy: Math.sin(angle) * v - speed * 0.3, life: max, max, size: size * (0.6 + this.random() * 0.6), colour: colours[i % colours.length] ?? this.theme.star });
    }
  }

  add(event: GameEvent): void {
    const { theme } = this;
    switch (event.type) {
      case 'score':
        this.burst(event.x, event.y, 12, [theme.star, theme.primary, theme.light], 320, 9);
        this.pops.push({ x: event.x, y: event.y - 20, text: `+${event.points ?? 1}`, life: POP_SECONDS });
        break;
      case 'hit':
        this.burst(event.x, event.y, 10, [theme.stone, theme.danger, theme.light], 260, 10);
        if (!this.reducedMotion) this.shake = SHAKE_SECONDS;
        break;
      case 'miss':
        this.burst(event.x, event.y, 6, [theme.light, theme.stone], 140, 7);
        break;
      case 'action':
        this.burst(event.x, event.y, 5, [theme.groundDeep, theme.light], 160, 8);
        break;
    }
  }

  update(dt: number): void {
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += 600 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const pop of this.pops) pop.life -= dt;
    this.pops = this.pops.filter((p) => p.life > 0);
    this.shake = Math.max(0, this.shake - dt);
  }

  /** How far to move the whole picture this frame (a shake after a bump). */
  offset(time: number): { x: number; y: number } {
    if (this.shake <= 0) return { x: 0, y: 0 };
    const k = (this.shake / SHAKE_SECONDS) * 12;
    return { x: Math.sin(time * 70) * k, y: Math.cos(time * 53) * k * 0.6 };
  }

  draw(ctx: CanvasRenderingContext2D, view: DrawView): void {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.colour;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const pop of this.pops) {
      const t = 1 - pop.life / POP_SECONDS;
      ctx.globalAlpha = Math.min(1, pop.life / (POP_SECONDS * 0.5));
      paintLabel(ctx, view, pop.text, pop.x, pop.y - (this.reducedMotion ? 0 : t * 70), 46 + (this.reducedMotion ? 0 : Math.sin(Math.min(1, t * 4) * Math.PI) * 10), view.theme.star);
    }
    ctx.globalAlpha = 1;
  }
}
