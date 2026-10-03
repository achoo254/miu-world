// Recipe assembly's picture: a bánh mì stall (striped awning, tiled wall, wooden counter), the customer with
// a speech bubble of the order (fillings in order, the ones done ticked with a star) and a patience bar
// under it, the open baguette with the fillings put on so far, the six trays along the counter, the filling
// under the finger while it is dragged, and a wrong filling hopping back to its tray.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { FILLINGS, type RecipeState } from './logic';

export function drawRecipeAssembly(ctx: CanvasRenderingContext2D, state: RecipeState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.light;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = theme.secondary;
  for (let x = 0; x < arena.width; x += 60) for (let y = HUD_SAFE_TOP; y < arena.height; y += 60) if ((x + y) % 120 === 0) ctx.fillRect(x, y, 60, 60);
  ctx.globalAlpha = 1;
  for (let x = 0, i = 0; x < arena.width; x += 60, i += 1) {
    ctx.fillStyle = i % 2 ? theme.light : theme.danger;
    ctx.fillRect(x, 0, 60, HUD_SAFE_TOP - 24);
    ctx.beginPath();
    ctx.arc(x + 30, HUD_SAFE_TOP - 24, 30, 0, Math.PI);
    ctx.fill();
  }
  const counterTop = Math.min(...state.trays.map((t) => t.y)) - state.tray / 2 - 16;
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, counterTop, arena.width, arena.height - counterTop);
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(0, counterTop, arena.width, 10);

  // The customer.
  const c = state.customerAt;
  let cx = c.x;
  let alpha = 1;
  if (state.phase === 'arrive') cx = c.x - (1 - state.phaseAgo / 0.6) * 260;
  if (state.phase === 'leave') {
    cx = c.x - (state.phaseAgo / 0.9) * 300;
    alpha = 1 - state.phaseAgo / 0.9;
  }
  const hop = state.phase === 'happy' && !view.reducedMotion ? Math.abs(Math.sin(state.phaseAgo * 10)) * 24 : 0;
  ctx.globalAlpha = Math.max(0, alpha);
  sprites.draw(ctx, state.customer, cx, c.y - hop + bob(view, 2, 3), 130);
  if (state.phase === 'happy') sprites.draw(ctx, 'baguette-bread', cx + 50, c.y + 20 - hop, 90);
  ctx.globalAlpha = 1;

  // The order bubble and patience.
  if (state.phase === 'wait' || state.phase === 'arrive') {
    const n = state.order.length;
    const bx = c.x + 90;
    const bw = n * 78 + 24;
    const by = c.y - 50;
    ctx.fillStyle = theme.light;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 5;
    roundRect(ctx, bx, by, bw, 100, 22);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx + 4, by + 40);
    ctx.lineTo(bx - 20, by + 60);
    ctx.lineTo(bx + 4, by + 62);
    ctx.fill();
    state.order.forEach((f, k) => {
      const x = bx + 12 + 39 + k * 78;
      const done = k < state.made;
      ctx.globalAlpha = done ? 0.4 : 1;
      sprites.draw(ctx, FILLINGS[f] ?? 'egg', x, by + 50, 62);
      ctx.globalAlpha = 1;
      if (done) sprites.draw(ctx, 'star', x + 20, by + 26, 34);
      if (k === state.made) {
        ctx.strokeStyle = theme.primary;
        ctx.lineWidth = 4;
        roundRect(ctx, x - 36, by + 12, 72, 76, 14);
        ctx.stroke();
      }
    });
    const frac = Math.max(0, state.patience / state.patienceMax);
    ctx.fillStyle = theme.stone;
    roundRect(ctx, bx, by + 112, bw, 14, 7);
    ctx.fill();
    ctx.fillStyle = frac > 0.5 ? theme.leaf : frac > 0.25 ? theme.star : theme.danger;
    roundRect(ctx, bx, by + 112, bw * frac, 14, 7);
    ctx.fill();
  }

  // The bread and what is on it.
  const b = state.bread;
  // The loaf lies flat on a plate, the fillings along its top.
  ctx.fillStyle = theme.stone;
  ctx.beginPath();
  ctx.ellipse(b.x, b.y + 34, 160, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  sprites.draw(ctx, 'baguette-bread', b.x, b.y, 270, { rotate: 1.05 });
  for (let k = 0; k < state.made; k += 1) {
    const f = state.order[k] ?? 0;
    sprites.draw(ctx, FILLINGS[f] ?? 'egg', b.x - 75 + k * 50, b.y - 22, 64);
  }

  // Trays.
  state.trays.forEach((t, i) => {
    const s = state.tray;
    ctx.fillStyle = theme.light;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    roundRect(ctx, t.x - s / 2, t.y - s / 2, s, s, 18);
    ctx.fill();
    ctx.stroke();
    const carried = state.carrying?.filling === i;
    ctx.globalAlpha = carried ? 0.4 : 1;
    sprites.draw(ctx, FILLINGS[i] ?? 'egg', t.x, t.y, s * 0.68);
    ctx.globalAlpha = 1;
  });
  if (state.bounce) {
    const t = Math.min(1, state.bounce.ago / 0.5);
    const tray = state.trays[state.bounce.filling] ?? b;
    sprites.draw(ctx, FILLINGS[state.bounce.filling] ?? 'egg', b.x + (tray.x - b.x) * t, b.y + (tray.y - b.y) * t - Math.sin(t * Math.PI) * 120, 70);
    paintLabel(ctx, view, 'Chưa đúng món!', b.x, b.y - 110, 34, theme.light);
  }
  if (state.carrying) sprites.draw(ctx, FILLINGS[state.carrying.filling] ?? 'egg', state.carrying.at.x, state.carrying.at.y - 30, 90);
  if (state.phase === 'happy') paintLabel(ctx, view, 'Ngon quá!', b.x, b.y - 110, 44, theme.star);
}
