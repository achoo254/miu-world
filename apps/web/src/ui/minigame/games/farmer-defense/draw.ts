// Farmer defense's picture: three rows of rice paddy with little dirt spots where farmers can stand, the
// rice sheaves stacked at the end of each row, birds flapping down the rows (big ones carry a second
// feather), farmers waving their hats (a white swish toward the bird), birds flying off for good or with a
// sheaf, and the hut along the bottom with the farmers still waiting. A farmer under the finger shows the
// free spots.
import { bob, paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { fieldPoint, MAX_FARMERS, ROWS, SPOTS, type FarmerDefenseState } from './logic';

export function drawFarmerDefense(ctx: CanvasRenderingContext2D, state: FarmerDefenseState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { field, hut, wide } = state;
  ctx.fillStyle = theme.groundDeep;
  ctx.fillRect(0, 0, arena.width, arena.height);
  // Paddy rows.
  for (let row = 0; row < ROWS; row += 1) {
    const a = fieldPoint(state, row, 0);
    const size = (wide ? field.h : field.w) / ROWS;
    ctx.fillStyle = row % 2 ? theme.ground : theme.leaf;
    ctx.globalAlpha = 0.9;
    if (wide) ctx.fillRect(field.x, a.y - size / 2 + 3, field.w, size - 6);
    else ctx.fillRect(a.x - size / 2 + 3, field.y, size - 6, field.h);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = theme.ink;
    for (let k = 0.05; k < 1; k += 0.06) {
      const p = fieldPoint(state, row, k);
      ctx.fillRect(p.x - 3, p.y - size * 0.3, 6, size * 0.6);
    }
    ctx.globalAlpha = 1;
    // Spots.
    for (const f of SPOTS) {
      const p = fieldPoint(state, row, f);
      const taken = state.farmers.some((x) => x.row === row && SPOTS[x.spot] === f);
      ctx.fillStyle = theme.groundDeep;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 20, 34, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (state.carrying && !taken) {
        ctx.strokeStyle = theme.light;
        ctx.lineWidth = 4;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 40, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    // Rice at the end of the row.
    const end = fieldPoint(state, row, 1);
    for (let k = 0; k < (state.rice[row] ?? 0); k += 1) {
      const off = (k - 1.5) * 30;
      sprites.draw(ctx, 'sheaf-of-rice', wide ? end.x - 10 - (k % 2) * 20 : end.x + off, wide ? end.y + off : end.y - 10 - (k % 2) * 20, 58);
    }
  }

  for (const f of state.farmers) {
    if (state.carrying?.from === f) continue;
    const p = fieldPoint(state, f.row, SPOTS[f.spot] ?? 0);
    const wave = f.wavedAgo < 0.35 && !view.reducedMotion ? Math.sin((f.wavedAgo / 0.35) * Math.PI) * 0.5 : 0;
    sprites.draw(ctx, 'farmer', p.x, p.y - 8, 86, { rotate: wave * (wide ? -1 : 1), flipX: wide });
    if (f.wavedAgo < 0.35) {
      const q = fieldPoint(state, f.row, f.waveAt);
      ctx.globalAlpha = 1 - f.wavedAgo / 0.35;
      ctx.strokeStyle = theme.light;
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 20);
      ctx.quadraticCurveTo((p.x + q.x) / 2 + (wide ? 0 : 30), (p.y + q.y) / 2 - (wide ? 30 : 0), q.x, q.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  for (const b of state.birds) {
    const p = fieldPoint(state, b.row, b.along);
    const flap = bob(view, 14, 5, b.row + b.along * 10);
    const size = b.big ? 74 : 60;
    if (b.gone >= 0) {
      ctx.globalAlpha = 1 - b.gone;
      const away = b.gone * 260;
      sprites.draw(ctx, b.big ? 'parrot' : 'bird', p.x + (wide ? away : 0), p.y - away, size, { flipX: !wide });
      if (b.thief) sprites.draw(ctx, 'sheaf-of-rice', p.x + (wide ? away : 0) + 12, p.y - away + 26, 36);
      ctx.globalAlpha = 1;
      continue;
    }
    const flinch = b.startled < 0.8 && !view.reducedMotion ? Math.sin(b.startled * 30) * 6 : 0;
    sprites.draw(ctx, b.big ? 'parrot' : 'bird', p.x + flinch, p.y - 10 + flap, size, { flipX: !wide });
    if (b.wavedAgo < 0.3) paintLabel(ctx, view, '!', p.x + 26, p.y - 40, 30, theme.star);
  }

  // The hut and the farmers waiting in it.
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, hut.x, hut.y, hut.w, hut.h, 18);
  ctx.fill();
  ctx.stroke();
  sprites.draw(ctx, 'house', hut.x + hut.w - 70, hut.y + hut.h / 2, hut.h * 0.8);
  const waiting = MAX_FARMERS - state.farmers.length - (state.carrying && !state.carrying.from ? 1 : 0);
  for (let k = 0; k < waiting; k += 1) sprites.draw(ctx, 'farmer', hut.x + 70 + k * 90, hut.y + hut.h / 2, hut.h * 0.75);
  if (waiting > 0 && state.farmers.length === 0) paintLabel(ctx, view, 'Kéo bác ra ruộng!', hut.x + hut.w / 2, hut.y - 22, 30, theme.star);
  if (state.carrying) sprites.draw(ctx, 'farmer', state.carrying.at.x, state.carrying.at.y - 30, 96);
}
