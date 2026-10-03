// Jetpack hold's picture: sky over two rows of city blocks scrolling at different speeds (lit windows), the
// street, spinning coins, storm clouds that flash when they zap, and the child with the rocket on her back,
// a flame under it while she holds.
import { bob, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { JetpackState } from './logic';

/** Deterministic pseudo-random 0–1 from an integer: the same block always has the same height. */
const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function paintCity(ctx: CanvasRenderingContext2D, view: DrawView, baseY: number, offset: number, scale: number, alpha: number): void {
  const { arena, theme } = view;
  const width = 110 * scale;
  const first = Math.floor(offset / width);
  ctx.globalAlpha = alpha;
  for (let i = first; i * width - offset < arena.width + width; i += 1) {
    const x = i * width - offset;
    const h = (160 + hash(i) * 260) * scale;
    const w = width - 12 * scale;
    ctx.fillStyle = hash(i + 7) > 0.5 ? theme.stone : theme.stoneEdge;
    roundRect(ctx, x, baseY - h, w, h + 4, 8 * scale);
    ctx.fill();
    ctx.fillStyle = theme.star;
    for (let wy = baseY - h + 22 * scale; wy < baseY - 30 * scale; wy += 42 * scale) {
      for (let wx = x + 14 * scale; wx < x + w - 24 * scale; wx += 30 * scale) {
        if (hash(i * 31 + wx * 0.37 + wy * 0.11) > 0.45) ctx.fillRect(wx, wy, 14 * scale, 18 * scale);
      }
    }
  }
  ctx.globalAlpha = 1;
}

export function drawJetpackHold(ctx: CanvasRenderingContext2D, state: JetpackState, view: DrawView): void {
  const { arena, sprites, theme } = view;
  const street = state.bottom + 52;
  paintSky(ctx, view, street, 10);
  paintCity(ctx, view, street, state.distance * 0.2, 0.75, 0.55);
  paintCity(ctx, view, street, state.distance * 0.45, 1, 0.9);
  // The street with its lane marks.
  ctx.fillStyle = theme.stoneEdge;
  ctx.fillRect(0, street, arena.width, arena.height - street);
  ctx.fillStyle = theme.light;
  const gap = 120;
  for (let x = -(state.distance % gap); x < arena.width; x += gap) ctx.fillRect(x, street + 26, 60, 8);

  for (const c of state.coins) {
    if (c.taken >= 0) {
      sprites.draw(ctx, 'coin', c.x, c.y - c.taken * 120, 54 * (1 + c.taken), { alpha: 1 - c.taken / 0.5 });
      continue;
    }
    const spin = view.reducedMotion ? 1 : Math.abs(Math.cos(view.time * 4 + c.x * 0.02));
    sprites.draw(ctx, 'coin', c.x, c.y, 54, { squash: [0.35 + 0.65 * spin, 1] });
  }

  for (const s of state.storms) {
    const flash = s.zapped >= 0 && s.zapped < 0.5;
    if (flash) {
      ctx.globalAlpha = 0.5 * (1 - s.zapped / 0.5);
      ctx.fillStyle = theme.star;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 90, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    sprites.draw(ctx, 'cloud-with-lightning', s.x, s.y + bob(view, 2, 6, s.x * 0.01), 128);
  }

  // The child, the rocket strapped behind her and its flame.
  const blink = state.invulnerable > 0 && Math.floor(state.invulnerable * 10) % 2 === 0;
  const alpha = blink ? 0.4 : 1;
  const tilt = view.reducedMotion ? 0 : Math.max(-0.25, Math.min(0.25, state.vy / 2200));
  const px = state.playerX;
  const py = state.playerY;
  paintShadow(ctx, view, px, street + 6, 70, (street - py) / 400);
  if (state.thrusting) {
    const flicker = view.reducedMotion ? 1 : 0.85 + 0.3 * Math.abs(Math.sin(view.time * 30));
    sprites.draw(ctx, 'fire', px - 34, py + 52 * flicker, 48 * flicker, { rotate: Math.PI, alpha });
  }
  sprites.draw(ctx, 'rocket', px - 34, py + 6, 62, { rotate: -Math.PI / 4 + tilt, alpha });
  sprites.draw(ctx, view.player, px, py, 86, { rotate: tilt, alpha });
}
