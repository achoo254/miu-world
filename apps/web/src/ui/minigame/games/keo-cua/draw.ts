// Kéo cưa lừa xẻ's picture: a yard with a log on two sawhorses, the long saw across it with a handle at each
// end, the child pulling one end and a bear friend the other. A pale ghost of the saw shows where the friend's
// rhythm wants it; the blade turns green while in time and sawdust flies. The cut deepens into the log, the
// rhyme's words pop up one per stroke, and a jam shakes the saw with "Kẹt!". A log cut through falls in halves.
import { bob, paintGround, paintHills, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { KeoCuaState } from './logic';
import { isJammed, RHYME } from './logic';

function paintSaw(ctx: CanvasRenderingContext2D, view: DrawView, state: KeoCuaState, offset: number, ghost: boolean): void {
  const { theme } = view;
  const half = state.half;
  const cx = state.x + offset;
  const y = state.y - 22;
  ctx.save();
  ctx.globalAlpha = ghost ? 0.3 : 1;
  ctx.fillStyle = ghost ? theme.light : state.inTime ? theme.leaf : theme.stone;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx - half, y - 18);
  ctx.lineTo(cx + half, y - 18);
  ctx.lineTo(cx + half, y + 8);
  // Teeth along the bottom.
  for (let x = cx + half; x > cx - half; x -= 16) {
    ctx.lineTo(x - 8, y + 20);
    ctx.lineTo(x - 16, y + 8);
  }
  ctx.closePath();
  ctx.fill();
  if (!ghost) ctx.stroke();
  // Handles.
  ctx.fillStyle = ghost ? theme.light : theme.wood;
  for (const side of [-1, 1]) {
    roundRect(ctx, cx + side * half - 14, y - 60, 28, 80, 12);
    ctx.fill();
    if (!ghost) ctx.stroke();
  }
  ctx.restore();
}

export function drawKeoCua(ctx: CanvasRenderingContext2D, state: KeoCuaState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const groundY = state.y + 130;
  paintSky(ctx, view, groundY, 6);
  paintHills(ctx, view, groundY, 20, 90, theme.leaf);
  paintGround(ctx, view, groundY);

  // Sawhorses and the log.
  const logW = Math.min(arena.width * 0.45, 360);
  ctx.fillStyle = theme.woodEdge;
  for (const side of [-1, 1]) {
    const lx = state.x + side * logW * 0.35;
    ctx.fillRect(lx - 34, state.y + 40, 12, groundY - state.y - 40);
    ctx.fillRect(lx + 22, state.y + 40, 12, groundY - state.y - 40);
  }
  paintShadow(ctx, view, state.x, groundY + 6, logW + 60);
  const fall = state.falling >= 0 ? Math.min(1, state.falling / 0.5) : 0;
  const notch = state.cut * 60;
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(state.x + side * fall * 40, state.y + 30 + fall * fall * 50);
    ctx.rotate(side * fall * 0.3);
    ctx.fillStyle = theme.wood;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    const x0 = side < 0 ? -logW / 2 : 4;
    roundRect(ctx, x0, -30, logW / 2 - 4, 60, 18);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // The cut: a dark slot growing down from the top of the log.
  if (state.falling < 0 && notch > 0) {
    ctx.fillStyle = theme.ink;
    ctx.fillRect(state.x - 4, state.y, 8, notch);
  }

  const jammed = isJammed(state);
  const shake = jammed && !view.reducedMotion ? Math.sin(state.time * 60) * 5 : 0;
  paintSaw(ctx, view, state, state.target, true);
  paintSaw(ctx, view, state, state.saw + shake, false);

  // The two sawyers at the handles.
  // They stand still and lean with the saw: toward it when it comes their way.
  const lean = view.reducedMotion ? 0 : (state.saw / state.reach) * 0.18;
  sprites.draw(ctx, view.player, state.x - state.stand, state.y - 30 + bob(view, 4, 2), 100, { rotate: lean });
  sprites.draw(ctx, 'bear', state.x + state.stand, state.y - 30 + bob(view, 4, 2, 1), 100, { rotate: lean, flipX: true });

  // Sawdust while in time.
  if (state.inTime && !view.reducedMotion) {
    ctx.fillStyle = theme.star;
    for (let i = 0; i < 5; i += 1) {
      const t = (view.time * 2 + i * 0.2) % 1;
      ctx.globalAlpha = 1 - t;
      ctx.beginPath();
      ctx.arc(state.x + (i - 2) * 14 + Math.sin(i * 3) * t * 30, state.y + notch + t * 70, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // The rhyme: the word of the latest stroke, popping.
  const since = state.time - state.strokeAt;
  if (state.strokes > 0) {
    const word = RHYME[(state.strokes - 1) % RHYME.length] ?? '';
    const pop = view.reducedMotion ? 1 : 1 + 0.3 * Math.max(0, 1 - since / 0.2);
    paintLabel(ctx, view, word, state.x, Math.max(150, state.y - 120), 54 * pop, theme.light);
  }
  if (jammed) paintLabel(ctx, view, 'Kẹt!', state.x, state.y + 90, 46, theme.danger);
  if (state.falling >= 0) sprites.draw(ctx, 'sparkles', state.x, state.y - 10, 70, { alpha: 1 - fall });
  // Where to drag: a track with arrows under the log.
  const trackY = Math.min(arena.height - 50, groundY + 70);
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = theme.light;
  roundRect(ctx, state.x - state.reach - 50, trackY - 22, state.reach * 2 + 100, 44, 22);
  ctx.fill();
  ctx.globalAlpha = 1;
  paintLabel(ctx, view, '◀  kéo  ▶', state.x, trackY, 30, theme.primary);
}
