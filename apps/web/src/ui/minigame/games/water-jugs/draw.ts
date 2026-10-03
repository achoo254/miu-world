// Water jugs' picture: a farmyard with the cow and its trough under the HUD (the asked amount written big on
// the trough), the "Làm lại" button, and the cans standing on the ground: clear tins with a mark for every
// litre, their size on a tag on top and how much they hold written on the water. A chosen can lifts; a pour
// tips it toward the other can with a stream of water arcing across. When solved, the cow bends to drink.
import { bob, paintGround, paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { POUR_SECONDS, type Jug, type JugsState } from './logic';

function paintJug(ctx: CanvasRenderingContext2D, view: DrawView, jug: Jug, level: number, lift: number, chosen: boolean, glow: boolean): void {
  const { theme } = view;
  const x = jug.x - jug.width / 2;
  const top = jug.bottom - jug.height - lift;
  const h = jug.height;
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.85;
  roundRect(ctx, x, top, jug.width, h, 14);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Water.
  const waterH = (h - 8) * (level / jug.cap);
  if (waterH > 0) {
    ctx.fillStyle = theme.water;
    roundRect(ctx, x + 4, top + h - 4 - waterH, jug.width - 8, waterH, 10);
    ctx.fill();
  }
  // A mark for every litre.
  ctx.strokeStyle = theme.ink;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 2;
  for (let l = 1; l < jug.cap; l += 1) {
    const y = top + h - 4 - (h - 8) * (l / jug.cap);
    ctx.beginPath();
    ctx.moveTo(x + 4, y);
    ctx.lineTo(x + 20, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = chosen ? 9 : 5;
  ctx.strokeStyle = glow ? theme.star : chosen ? theme.star : theme.ink;
  roundRect(ctx, x, top, jug.width, h, 14);
  ctx.stroke();
  // Size tag on top, amount on the water.
  ctx.fillStyle = theme.wood;
  roundRect(ctx, jug.x - 38, top - 40, 76, 36, 10);
  ctx.fill();
  paintLabel(ctx, view, `${jug.cap} l`, jug.x, top - 21, 26);
  paintLabel(ctx, view, `${Math.round(level)}`, jug.x, top + h - Math.max(36, waterH / 2), 44, level > 0 ? theme.light : theme.stone);
}

export function drawWaterJugs(ctx: CanvasRenderingContext2D, state: JugsState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const ground = arena.height - 50;
  paintSky(ctx, view, ground, 8);
  paintHills(ctx, view, ground - 10, 30, 90, theme.leaf);
  paintGround(ctx, view, ground);

  // The cow and its trough with the asked amount.
  const t = state.trough;
  const drink = state.solved >= 0 && !view.reducedMotion ? Math.sin(Math.min(1, state.solved / 0.4) * Math.PI * 0.5) * 0.35 : 0;
  sprites.draw(ctx, 'cow', t.x + 70, t.y - 10 + bob(view, 2, 2), 110, { rotate: drink });
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, t.x - 90, t.y + 6, 150, 50, 12);
  ctx.fill();
  if (state.solved >= 0) {
    ctx.fillStyle = theme.water;
    roundRect(ctx, t.x - 82, t.y + 12, 134, 16, 8);
    ctx.fill();
  }
  paintLabel(ctx, view, `${state.puzzle.target} lít`, t.x - 15, t.y + 34, 34, theme.star);

  // The reset button.
  const r = state.resetRadius;
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  ctx.arc(state.reset.x, state.reset.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.stroke();
  paintLabel(ctx, view, '↺', state.reset.x, state.reset.y - 4, 44, theme.secondary);
  paintLabel(ctx, view, 'Làm lại', state.reset.x, state.reset.y + r + 16, 20);

  // The cans; during a pour the water moves bit by bit and a stream arcs across.
  const p = state.pouring;
  const k = p ? Math.min(1, p.t / POUR_SECONDS) : 0;
  state.jugs.forEach((jug, i) => {
    let level = jug.level;
    if (p && i === p.from) level -= p.amount * k;
    if (p && i === p.to) level += p.amount * k;
    const lift = state.selected === i || p?.from === i ? 24 : 0;
    ctx.save();
    if (p && i === p.from) {
      const to = state.jugs[p.to];
      const dir = to && to.x > jug.x ? 1 : -1;
      ctx.translate(jug.x, jug.bottom - lift);
      ctx.rotate(dir * 0.22 * Math.sin(Math.min(1, k * 3) * Math.PI * 0.5));
      ctx.translate(-jug.x, -(jug.bottom - lift));
    }
    paintJug(ctx, view, jug, level, lift, state.selected === i, state.answer === i);
    ctx.restore();
  });
  if (p) {
    const a = state.jugs[p.from];
    const b = state.jugs[p.to];
    if (a && b) {
      const dir = b.x > a.x ? 1 : -1;
      const sx = a.x + (dir * a.width) / 2;
      const sy = a.bottom - a.height - 24;
      ctx.strokeStyle = theme.water;
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo((sx + b.x) / 2, Math.min(sy, b.bottom - b.height) - 80, b.x, b.bottom - b.height + 10);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }
  if (state.solved >= 0) sprites.draw(ctx, 'sparkles', t.x - 15, t.y - 30 - state.solved * 30, 60);
  paintLabel(ctx, view, 'Chạm can rót, rồi chạm can nhận', arena.width / 2, ground + 26, 24);
}
