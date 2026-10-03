// Kite flute's picture: a wide sky over the fields, the kite with its flute riding higher as notes go well,
// its string down to the child, the wind ribbon the notes float along (long notes are long bars), the line
// where a note is caught with the flute on it, a held note filling up gold, and a cheer for a note held right.
import { bob, paintGround, paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { noteX, type HoldNotesState } from './logic';

export function drawHoldNotes(ctx: CanvasRenderingContext2D, state: HoldNotesState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const groundY = arena.height - Math.max(70, arena.height * 0.12);
  paintSky(ctx, view, groundY, 14);
  paintHills(ctx, view, groundY, view.time * 10, 60, theme.leaf);
  paintGround(ctx, view, groundY, view.time * 20);

  // The kite and its string.
  const kite = { x: arena.width * 0.72, y: state.laneY - 140 - state.kiteLift * Math.max(0, state.laneY - 140 - 150) + bob(view, 1.4, 12) };
  const child = { x: 70, y: groundY - 10 };
  ctx.strokeStyle = theme.ink;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(child.x + 20, child.y - 30);
  ctx.quadraticCurveTo((child.x + kite.x) / 2, Math.max(kite.y, child.y - 60), kite.x, kite.y + 40);
  ctx.stroke();
  ctx.globalAlpha = 1;
  sprites.draw(ctx, 'kite', kite.x, kite.y, 120, { rotate: view.reducedMotion ? 0 : Math.sin(view.time * 1.7) * 0.12 });
  sprites.draw(ctx, view.player, child.x, child.y - 34, 80);

  // The wind ribbon.
  const h = 54;
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.45;
  roundRect(ctx, -20, state.laneY - h / 2 - 12, arena.width + 40, h + 24, 30);
  ctx.fill();
  ctx.globalAlpha = 1;

  for (const note of state.notes) {
    const x0 = noteX(state, note.at);
    const x1 = noteX(state, note.at + note.len);
    if (x1 < -40 || x0 > arena.width + 40) continue;
    const gone = note.result !== null ? Math.min(1, (state.time - note.judgedAt) / 0.4) : 0;
    if (gone >= 1) continue;
    ctx.globalAlpha = 1 - gone;
    ctx.fillStyle = note.result === 'good' || note.result === 'perfect' ? theme.star : note.result !== null ? theme.stone : theme.secondary;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    roundRect(ctx, x0, state.laneY - h / 2, Math.max(h, x1 - x0), h, h / 2);
    ctx.fill();
    ctx.stroke();
    if (note.holding) {
      // Held: the part already sung fills gold.
      const filled = Math.min(x1, state.lineX) - x0;
      if (filled > 0) {
        ctx.fillStyle = theme.star;
        roundRect(ctx, x0, state.laneY - h / 2, Math.max(h, filled), h, h / 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    sprites.draw(ctx, 'musical-note', x0 + h / 2, state.laneY, 40);
    ctx.globalAlpha = 1;
  }

  // The catch line with the flute.
  const holding = state.notes.some((n) => n.holding);
  ctx.strokeStyle = holding ? theme.star : theme.light;
  ctx.lineWidth = holding ? 10 : 6;
  ctx.beginPath();
  ctx.moveTo(state.lineX, state.laneY - h);
  ctx.lineTo(state.lineX, state.laneY + h);
  ctx.stroke();
  sprites.draw(ctx, 'flute', state.lineX, state.laneY + h + 34, 90, { rotate: -0.5, squash: holding && !view.reducedMotion ? [1.05, 0.95] : [1, 1] });

  if ((state.lastResult === 'good' || state.lastResult === 'perfect') && state.time - state.lastAt < 0.6) {
    paintLabel(ctx, view, state.lastResult === 'perfect' ? 'Tuyệt!' : 'Hay!', state.lineX, state.laneY - h - 30 - (state.time - state.lastAt) * 40, 36, theme.star);
  }
}
