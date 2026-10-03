// Painting helpers every game may use: a sky with drifting clouds, rolling hills, a ground band, soft
// shadows, rounded boxes and outlined labels, in the map's theme colours. All in arena units.
import type { DrawView } from './types';

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Sky gradient over the whole arena, down to `horizon`, with a few clouds drifting at `drift` units/s. */
export function paintSky(ctx: CanvasRenderingContext2D, view: DrawView, horizon = view.arena.height, drift = 12): void {
  const { arena, theme } = view;
  const gradient = ctx.createLinearGradient(0, 0, 0, horizon);
  gradient.addColorStop(0, theme.sky[0]);
  gradient.addColorStop(0.6, theme.sky[1]);
  gradient.addColorStop(1, theme.sky[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.light;
  for (let i = 0; i < 4; i += 1) {
    const span = arena.width + 240;
    const x = ((i * 337 + view.time * drift * (1 + i * 0.3)) % span) - 120;
    const y = horizon * (0.18 + 0.14 * (i % 3));
    const s = 34 + (i % 2) * 14;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.arc(x + s, y + 8, s * 0.8, 0, Math.PI * 2);
    ctx.arc(x - s, y + 10, s * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Rolling hills along `baseY`, scrolled by `offset` units (pass a slower offset than the ground for depth). */
export function paintHills(ctx: CanvasRenderingContext2D, view: DrawView, baseY: number, offset: number, height: number, colour: string): void {
  const { width } = view.arena;
  const wave = 260;
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(0, view.arena.height);
  for (let x = 0; x <= width + 20; x += 20) {
    const t = (x + offset) / wave;
    ctx.lineTo(x, baseY - height * (0.55 + 0.45 * Math.sin(t) * Math.cos(t * 0.37)));
  }
  ctx.lineTo(width, view.arena.height);
  ctx.closePath();
  ctx.fill();
}

/** The ground from `y` to the bottom: a top strip of the theme's ground over soil, with stripes scrolled by `offset`. */
export function paintGround(ctx: CanvasRenderingContext2D, view: DrawView, y: number, offset = 0): void {
  const { arena, theme } = view;
  ctx.fillStyle = theme.groundDeep;
  ctx.fillRect(0, y, arena.width, arena.height - y);
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, y, arena.width, 26);
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = theme.ink;
  const gap = 90;
  for (let x = -((offset % gap) + gap) % gap; x < arena.width; x += gap) ctx.fillRect(x, y + 48, 40, 8);
  ctx.globalAlpha = 1;
}

/** A soft oval shadow under something standing at (x, y); `lift` (0–1) shrinks it while it is in the air. */
export function paintShadow(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, width: number, lift = 0): void {
  const scale = 1 - Math.min(0.6, Math.max(0, lift));
  ctx.globalAlpha = 0.22 * scale + 0.05;
  ctx.fillStyle = view.theme.ink;
  ctx.beginPath();
  ctx.ellipse(x, y, (width / 2) * scale, (width / 7) * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** Big rounded text with a dark outline, readable over any background (the display font of the app). */
export function paintLabel(ctx: CanvasRenderingContext2D, view: DrawView, text: string, x: number, y: number, size: number, colour = view.theme.light): void {
  ctx.font = `800 ${size}px ${view.theme.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size / 6;
  ctx.strokeStyle = view.theme.ink;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = colour;
  ctx.fillText(text, x, y);
}

/** A gentle up-and-down for idle things (0 under reduced motion). */
export const bob = (view: DrawView, speed = 3, amount = 6, phase = 0): number => (view.reducedMotion ? 0 : Math.sin(view.time * speed + phase) * amount);
