// River crossing's picture: two grassy banks and the river between them, the three things on their banks, the
// boat with the child (and its load) rowing across, the oar button, a small board with the two rules (who must
// not stay alone with whom), the chase that plays out when a rule is broken, and a cheer on the far bank.
import { bob, paintLabel, paintShadow, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import type { DrawView, Point } from '../../types';
import { boatPoint, CONFLICTS, slotPoint, type CrossingState } from './logic';

/** The things of each set: chaser, eater, food. */
export const THINGS: readonly (readonly [SpriteRef, SpriteRef, SpriteRef])[] = [
  ['dog', 'chicken', 'sheaf-of-rice'],
  ['fox', 'duck', 'ear-of-corn'],
  ['cat', 'mouse-face', 'cookie'],
];

function paintRules(ctx: CanvasRenderingContext2D, view: DrawView, things: readonly SpriteRef[], at: Point): void {
  const { theme, sprites } = view;
  const w = 200;
  const h = 112;
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 5;
  roundRect(ctx, at.x - w / 2, at.y - h / 2, w, h, 16);
  ctx.fill();
  ctx.stroke();
  CONFLICTS.forEach(([a, b], row) => {
    const y = at.y - h / 4 + row * (h / 2);
    sprites.draw(ctx, things[a] ?? 'dog', at.x - 52, y, 42);
    sprites.draw(ctx, things[b] ?? 'chicken', at.x + 52, y, 42);
    ctx.strokeStyle = theme.danger;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(at.x - 12, y - 12);
    ctx.lineTo(at.x + 12, y + 12);
    ctx.moveTo(at.x + 12, y - 12);
    ctx.lineTo(at.x - 12, y + 12);
    ctx.stroke();
  });
}

export function drawRiverCrossing(ctx: CanvasRenderingContext2D, state: CrossingState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const things = THINGS[state.set % THINGS.length] ?? THINGS[0] ?? ['dog', 'chicken', 'sheaf-of-rice'];
  const { slot, wide, near, far } = state;
  // Banks and river.
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.water;
  const bankHalf = slot * 0.8;
  if (wide) ctx.fillRect(near.x + bankHalf, 0, far.x - near.x - bankHalf * 2, arena.height);
  else ctx.fillRect(0, far.y + bankHalf, arena.width, near.y - far.y - bankHalf * 2);
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.5;
  for (let k = 0; k < 14; k += 1) {
    const flow = (view.time * 25 + k * 97) % (wide ? arena.height : arena.width);
    const across = wide ? near.x + bankHalf + ((k * 71) % Math.max(1, far.x - near.x - bankHalf * 2)) : far.y + bankHalf + ((k * 71) % Math.max(1, near.y - far.y - bankHalf * 2));
    ctx.beginPath();
    if (wide) {
      ctx.moveTo(across, flow);
      ctx.lineTo(across, flow + 26);
    } else {
      ctx.moveTo(flow, across);
      ctx.lineTo(flow + 26, across);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Reeds along the banks.
  for (let k = 0; k < 4; k += 1) {
    const p = wide ? { x: near.x - slot * 0.5, y: near.y + (k - 1.5) * slot * 1.1 } : { x: near.x + (k - 1.5) * slot * 1.4, y: near.y + slot * 0.7 };
    sprites.draw(ctx, 'herb', p.x, p.y, 40, { alpha: 0.6 });
  }

  paintRules(ctx, view, things, wide ? { x: arena.width / 2, y: 175 } : { x: 120, y: (near.y + far.y) / 2 });

  // Things on the banks (an oops makes the culprit lunge at its target).
  const oops = state.phase === 'oops' ? state.culprits : null;
  for (let i = 0; i < 3; i += 1) {
    const spot = state.spots[i];
    if (spot === 'boat' || spot === undefined) continue;
    let p = slotPoint(state, spot, i);
    if (oops && oops[0] === i) {
      const target = slotPoint(state, spot, oops[1]);
      const t = view.reducedMotion ? 0.5 : Math.abs(Math.sin(state.phaseAgo * 6)) * 0.6;
      p = { x: p.x + (target.x - p.x) * t, y: p.y + (target.y - p.y) * t };
    }
    paintShadow(ctx, view, p.x, p.y + slot * 0.38, slot * 0.7);
    const jump = state.phase === 'solved' && !view.reducedMotion ? Math.abs(Math.sin(view.time * 8 + i)) * 16 : 0;
    sprites.draw(ctx, things[i] ?? 'dog', p.x, p.y - jump + bob(view, 2, 2, i), slot * 0.85);
  }
  if (oops) {
    const p = slotPoint(state, state.boat, oops[1]);
    paintLabel(ctx, view, '!', p.x + slot * 0.4, p.y - slot * 0.5, 54, theme.danger);
  }

  // The boat with the child and its load.
  const boat = boatPoint(state);
  const bw = slot * 1.4;
  const bh = slot * 0.5;
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(boat.x - bw / 2, boat.y);
  ctx.lineTo(boat.x + bw / 2, boat.y);
  ctx.lineTo(boat.x + bw * 0.36, boat.y + bh);
  ctx.lineTo(boat.x - bw * 0.36, boat.y + bh);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const rock = state.phase === 'crossing' && !view.reducedMotion ? Math.sin(view.time * 10) * 0.08 : 0;
  sprites.draw(ctx, view.player, boat.x - bw * 0.22, boat.y - bh * 0.4, slot * 0.7, { rotate: rock });
  const loaded = state.spots.indexOf('boat');
  if (loaded >= 0) sprites.draw(ctx, things[loaded] ?? 'dog', boat.x + bw * 0.22, boat.y - bh * 0.35, slot * 0.66, { rotate: -rock });

  // Oar button.
  const ready = state.phase === 'load';
  ctx.globalAlpha = ready ? 1 : 0.5;
  ctx.fillStyle = theme.primary;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(state.oar.x, state.oar.y, state.oarRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // A paddle drawn across the button.
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(state.oar.x - state.oarRadius * 0.5, state.oar.y + state.oarRadius * 0.5);
  ctx.lineTo(state.oar.x + state.oarRadius * 0.3, state.oar.y - state.oarRadius * 0.3);
  ctx.stroke();
  ctx.fillStyle = theme.wood;
  ctx.beginPath();
  ctx.ellipse(state.oar.x + state.oarRadius * 0.38, state.oar.y - state.oarRadius * 0.38, 12, 22, Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();
  paintLabel(ctx, view, 'Chèo', state.oar.x, state.oar.y + state.oarRadius + 18, 24);
  ctx.globalAlpha = 1;

  if (state.phase === 'solved') {
    sprites.draw(ctx, 'sparkles', far.x + slot, far.y - slot * 0.6, 56, { alpha: 1 - state.phaseAgo / 1.4 });
    paintLabel(ctx, view, 'Qua hết rồi!', arena.width / 2, wide ? arena.height / 2 : (near.y + far.y) / 2, 46, theme.star);
  }
}
