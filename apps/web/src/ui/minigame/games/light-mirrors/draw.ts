// Light mirrors' picture: a castle courtyard of stone tiles, the sun at the left of its row, the flower
// outside the grid (a bud until the beam reaches it, then a sunflower), mirrors as silver bars on round
// stands (a spin when flipped), and the beam drawn as a glowing yellow line from corner to corner.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { MirrorState } from './logic';

export function drawLightMirrors(ctx: CanvasRenderingContext2D, state: MirrorState, view: DrawView): void {
  const { arena, sprites, theme } = view;
  const s = state.cell;
  const cx = (x: number): number => state.originX + (x + 0.5) * s;
  const cy = (y: number): number => state.originY + (y + 0.5) * s;
  const gradient = ctx.createLinearGradient(0, 0, 0, arena.height);
  gradient.addColorStop(0, theme.sky[0]);
  gradient.addColorStop(1, theme.sky[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, arena.width, arena.height);

  // The grid: tiles with a border.
  ctx.fillStyle = theme.stoneEdge;
  roundRect(ctx, state.originX - 10, state.originY - 10, state.cols * s + 20, state.rows * s + 20, 16);
  ctx.fill();
  for (let y = 0; y < state.rows; y += 1) {
    for (let x = 0; x < state.cols; x += 1) {
      ctx.fillStyle = (x + y) % 2 === 0 ? theme.stone : theme.light;
      ctx.fillRect(state.originX + x * s + 2, state.originY + y * s + 2, s - 4, s - 4);
    }
  }

  // The beam.
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [width, colour, alpha] of [[s * 0.42, theme.star, 0.35], [s * 0.14, theme.star, 1], [s * 0.05, theme.light, 1]] as const) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.beginPath();
    state.beam.forEach((p, i) => {
      const x = cx(p.x);
      const y = cy(p.y);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  for (const m of state.mirrors) {
    const x = cx(m.x);
    const y = cy(m.y);
    ctx.fillStyle = theme.woodEdge;
    ctx.beginPath();
    ctx.arc(x, y, s * 0.36, 0, Math.PI * 2);
    ctx.fill();
    const spin = view.reducedMotion ? 0 : Math.max(0, 1 - m.flipped / 0.2) * (Math.PI / 2);
    const angle = (m.tilt === '/' ? -Math.PI / 4 : Math.PI / 4) - spin;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = theme.waterLight;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    roundRect(ctx, -s * 0.46, -s * 0.09, s * 0.92, s * 0.18, s * 0.06);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.light;
    ctx.fillRect(-s * 0.36, -s * 0.05, s * 0.3, s * 0.04);
    ctx.restore();
  }

  sprites.draw(ctx, 'sun', cx(-1), cy(state.sunRow), s * 1.05, { rotate: view.reducedMotion ? 0 : view.time * 0.5 });
  const fx = cx(state.flower.x);
  const fy = cy(state.flower.y);
  if (state.lit) {
    const grow = view.reducedMotion ? 1 : Math.min(1, 0.5 + Math.max(0, state.bloomed) * 2);
    sprites.draw(ctx, 'sunflower', fx, fy, s * 1.1 * grow);
    paintLabel(ctx, view, 'Hoa nở!', arena.width / 2, state.originY - s * 0.6, 50, theme.star);
  } else sprites.draw(ctx, 'seedling', fx, fy, s * 0.85, { alpha: 0.95 });
}
