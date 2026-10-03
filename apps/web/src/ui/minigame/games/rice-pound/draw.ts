// Rice pound's picture: a farmyard, a big wooden mortar full of rice, the friend on the left and the child on
// the right, each with a long pestle that drops on its beat and lifts again. A ring closes on the child's side of
// the mortar as her beat comes (so it plays without sound too); rice jumps on a right beat, the pestles flash and
// shake when they knock together.
import { bob, paintGround, paintHills, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { RicePoundState } from './logic';

/** 0 = pestle down in the mortar, 1 = lifted high. */
function lift(time: number, strikeAt: number, nextAt: number | null): number {
  const since = time - strikeAt;
  let up = since < 0.28 ? since / 0.28 : 1;
  if (nextAt !== null && nextAt - time < 0.12 && nextAt >= time) up = Math.min(up, (nextAt - time) / 0.12);
  return Math.max(0, Math.min(1, up));
}

function paintPestle(ctx: CanvasRenderingContext2D, view: DrawView, x: number, mouthY: number, up: number, tilt: number): void {
  const { theme } = view;
  const length = 230;
  const bottom = mouthY - 10 - up * 120;
  ctx.save();
  ctx.translate(x, bottom);
  ctx.rotate(tilt);
  ctx.fillStyle = theme.wood;
  roundRect(ctx, -11, -length, 22, length, 10);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.woodEdge;
  ctx.stroke();
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, -18, -36, 36, 40, 12);
  ctx.fill();
  ctx.restore();
}

export function drawRicePound(ctx: CanvasRenderingContext2D, state: RicePoundState, view: DrawView): void {
  const { theme, sprites } = view;
  const { x, y } = state.mortar;
  paintSky(ctx, view, y - 20, 6);
  paintHills(ctx, view, y - 20, 30, 90, theme.leaf);
  paintGround(ctx, view, y + 40);
  sprites.draw(ctx, 'sheaf-of-rice', x - 260, y + 20, 110);
  sprites.draw(ctx, 'sheaf-of-rice', x + 270, y + 30, 90);

  const nextFriend = state.beats.find((b) => !b.mine && b.at >= state.time);
  const nextMine = state.beats.find((b) => b.mine && b.result === null && b.at >= state.time - 0.05);
  const clash = state.time - state.clashAt < 0.4;
  const shake = clash && !view.reducedMotion ? Math.sin((state.time - state.clashAt) * 60) * 7 : 0;

  // The friend and the child stand either side.
  sprites.draw(ctx, 'farmer', x - 170, y - 40 + bob(view, 4, 3), 140);
  sprites.draw(ctx, view.player, x + 170, y - 40 + bob(view, 4, 3, 1.5), 140, { flipX: true });

  // The mortar.
  const mouthY = y - 20;
  paintShadow(ctx, view, x, y + 76, 230);
  ctx.fillStyle = theme.woodEdge;
  roundRect(ctx, x - 90 + shake, mouthY, 180, 100, 30);
  ctx.fill();
  ctx.fillStyle = theme.wood;
  ctx.beginPath();
  ctx.ellipse(x + shake, mouthY, 100, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  ctx.ellipse(x + shake, mouthY + 2, 76, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  // Rice jumps on a right beat.
  const sinceHit = state.lastResult === 'hit' ? state.time - state.lastResultAt : 9;
  if (sinceHit < 0.45 && !view.reducedMotion) {
    ctx.fillStyle = theme.light;
    for (let i = 0; i < 9; i += 1) {
      const a = -Math.PI / 2 + (i - 4) * 0.28;
      const d = sinceHit * 260;
      const gx = x + Math.cos(a) * d * 0.7;
      const gy = mouthY + Math.sin(a) * d + sinceHit * sinceHit * 900;
      ctx.beginPath();
      ctx.ellipse(gx, gy, 6, 4, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // The timing ring on the child's side: it closes onto the mortar's rim as her beat comes.
  const target = { x: x + 34, y: mouthY };
  if (nextMine) {
    const ahead = nextMine.at - state.time;
    if (ahead < 0.9) {
      const r = 34 + Math.max(0, ahead) * 160;
      ctx.globalAlpha = Math.min(1, (0.9 - ahead) / 0.3);
      ctx.strokeStyle = theme.star;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(target.x, target.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  ctx.strokeStyle = theme.ink;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(target.x, target.y, 34, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  paintPestle(ctx, view, x - 34 + shake, mouthY, lift(state.time, state.friendStrikeAt, nextFriend?.at ?? null), 0.12);
  paintPestle(ctx, view, x + 34 + shake, mouthY, lift(state.time, state.myStrikeAt, null), -0.12);

  if (clash) sprites.draw(ctx, 'collision', x, mouthY - 140, 90, { alpha: 1 - (state.time - state.clashAt) / 0.4 });
  if (sinceHit < 0.5) paintLabel(ctx, view, 'Thình!', x + 120, mouthY - 170 - sinceHit * 40, 40, theme.star);
}
