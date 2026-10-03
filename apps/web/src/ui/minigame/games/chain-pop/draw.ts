// Chain pop's picture: a deep blue sea with bubbles rising, jellyfish drifting and pulsing, rings of light
// blooming where the child tapped and around every lit jellyfish (lit ones glow gold), and a shell badge with
// "lit / needed". The badge turns green once enough are lit.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { JELLY_RADIUS, RING_LIFE, ringRadius, type ChainPopState } from './logic';

export function drawChainPop(ctx: CanvasRenderingContext2D, state: ChainPopState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const gradient = ctx.createLinearGradient(0, 0, 0, arena.height);
  gradient.addColorStop(0, theme.waterLight);
  gradient.addColorStop(0.35, theme.water);
  gradient.addColorStop(1, theme.ink);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, arena.width, arena.height);
  // Light shafts and bubbles.
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = theme.light;
  for (let i = 0; i < 4; i += 1) {
    const x = (i + 0.5) * (arena.width / 4) + Math.sin(view.time * 0.3 + i) * 30;
    ctx.beginPath();
    ctx.moveTo(x - 30, 0);
    ctx.lineTo(x + 30, 0);
    ctx.lineTo(x + 110, arena.height);
    ctx.lineTo(x - 10, arena.height);
    ctx.fill();
  }
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i += 1) {
    const x = ((i * 173) % arena.width) + Math.sin(view.time * 2 + i) * 6;
    const y = arena.height - ((view.time * (30 + (i % 4) * 12) + i * 97) % arena.height);
    ctx.beginPath();
    ctx.arc(x, y, 4 + (i % 3) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Rock above and below the sea on a tall screen.
  const { sea } = state;
  ctx.fillStyle = theme.stoneEdge;
  if (sea.y > HUD_SAFE_TOP + 30) ctx.fillRect(0, 0, arena.width, sea.y - 10);
  if (sea.y + sea.h < arena.height - 30) ctx.fillRect(0, sea.y + sea.h + 10, arena.width, arena.height - sea.y - sea.h);
  // Sand and weed at the bottom.
  ctx.fillStyle = theme.groundDeep;
  ctx.beginPath();
  ctx.ellipse(arena.width / 2, arena.height + 30, arena.width * 0.7, 60, 0, 0, Math.PI * 2);
  ctx.fill();
  sprites.draw(ctx, 'herb', 40, arena.height - 40, 80);
  sprites.draw(ctx, 'spiral-shell', arena.width - 60, arena.height - 30, 54);

  // Rings.
  for (const r of state.rings) {
    if (r.age >= RING_LIFE) continue;
    const radius = ringRadius(r.age);
    const fade = r.age > RING_LIFE - 0.4 ? (RING_LIFE - r.age) / 0.4 : 1;
    ctx.globalAlpha = 0.18 * fade;
    ctx.fillStyle = theme.star;
    ctx.beginPath();
    ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.8 * fade;
    ctx.strokeStyle = theme.star;
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Jellyfish.
  state.jellies.forEach((j, i) => {
    const pulse = view.reducedMotion ? 1 : 1 + 0.08 * Math.sin(view.time * 4 + i);
    if (j.lit >= 0) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = theme.star;
      ctx.beginPath();
      ctx.arc(j.x, j.y, JELLY_RADIUS * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    sprites.draw(ctx, 'jellyfish', j.x, j.y + bob(view, 3, 3, i), JELLY_RADIUS * 2.4 * pulse, { alpha: j.lit >= 0 ? 1 : 0.8 });
  });

  // The badge.
  const lit = state.jellies.filter((j) => j.lit >= 0).length;
  const enough = lit >= state.need;
  const bx = 24;
  const by = Math.max(HUD_SAFE_TOP + 14, sea.y + 4);
  ctx.fillStyle = enough ? theme.leaf : theme.light;
  roundRect(ctx, bx, by, 170, 58, 22);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.ink;
  ctx.stroke();
  sprites.draw(ctx, 'jellyfish', bx + 34, by + 29, 44);
  ctx.font = `800 32px ${theme.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = theme.ink;
  ctx.fillText(`${lit} / ${state.need}`, bx + 110, by + 31);

  if (state.phase === 'aim' && state.phaseTime < 1.5) paintLabel(ctx, view, `Màn ${state.level + 1}`, arena.width / 2, by + 30, 40, theme.light);
  if (state.phase === 'passed') paintLabel(ctx, view, 'Qua màn!', arena.width / 2, arena.height / 2, 60, theme.star);
  if (state.phase === 'failed') paintLabel(ctx, view, 'Thử lại nhé!', arena.width / 2, arena.height / 2, 52, theme.light);
}
