// Slingshot's picture: sky, hills and the field; the child beside a wooden slingshot whose bands stretch to the
// stone while she pulls (with a few dots showing the start of its flight); the tower of parcels with the teddy
// on top, sliding in from the right and tumbling apart when hit; the stone flying and spinning; the stones left.
import { bob, paintGround, paintHills, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { aimDots, heldStone, STONE_RADIUS, STONES, type SlingState, type Tower } from './logic';

function paintTower(ctx: CanvasRenderingContext2D, view: DrawView, state: SlingState, tower: Tower, alpha: number): void {
  const { theme, sprites } = view;
  const shift = tower.enter * (state.width * 0.6);
  ctx.save();
  ctx.translate(shift, 0);
  ctx.globalAlpha = alpha;
  if (tower.ledge) {
    const { x, top, half } = tower.ledge;
    ctx.fillStyle = theme.stone;
    ctx.strokeStyle = theme.stoneEdge;
    ctx.lineWidth = 5;
    roundRect(ctx, x - half, top, half * 2, state.groundY - top + 6, 10);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = alpha * 0.3;
    ctx.fillStyle = theme.stoneEdge;
    for (let y = top + 24; y < state.groundY; y += 30) ctx.fillRect(x - half + 6, y, half * 2 - 12, 4);
    ctx.globalAlpha = alpha;
  }
  for (const b of tower.bodies) {
    if (!b.loose) paintShadow(ctx, view, b.x, (tower.ledge && Math.abs(b.x - tower.ledge.x) < tower.ledge.half ? tower.ledge.top : state.groundY) + 4, b.half * 2.2, 0.6);
  }
  for (const b of tower.bodies) {
    const sway = b.loose || view.reducedMotion ? 0 : Math.sin(view.time * 2 + b.y * 0.05) * 0.02;
    if (b.kind === 'teddy') sprites.draw(ctx, 'teddy-bear', b.x, b.y + (b.loose ? 0 : bob(view, 3, 2)), 76, { rotate: b.rot + sway });
    else sprites.draw(ctx, 'package', b.x, b.y, b.half * 2.25, { rotate: b.rot + sway });
  }
  ctx.restore();
}

function paintSlingshot(ctx: CanvasRenderingContext2D, view: DrawView, state: SlingState, back: boolean): void {
  const { theme } = view;
  const { pouch, groundY } = state;
  const left = { x: pouch.x - 28, y: pouch.y - 14 };
  const right = { x: pouch.x + 28, y: pouch.y - 14 };
  const pull = state.drag?.pull ?? { x: 0, y: 0 };
  const stone = heldStone(state, pull);
  if (back) {
    // The back band, behind the stone.
    ctx.strokeStyle = theme.danger;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(right.x, right.y);
    ctx.lineTo(stone.x, stone.y);
    ctx.stroke();
    return;
  }
  ctx.lineCap = 'round';
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.moveTo(pouch.x, groundY);
  ctx.lineTo(pouch.x, pouch.y + 34);
  ctx.lineTo(left.x, left.y);
  ctx.moveTo(pouch.x, pouch.y + 34);
  ctx.lineTo(right.x, right.y);
  ctx.stroke();
  ctx.strokeStyle = theme.wood;
  ctx.lineWidth = 10;
  ctx.stroke();
  // The front band over the stone.
  ctx.strokeStyle = theme.danger;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(left.x, left.y);
  ctx.lineTo(stone.x, stone.y);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

export function drawSlingshot(ctx: CanvasRenderingContext2D, state: SlingState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, state.groundY, 8);
  paintHills(ctx, view, state.groundY, 200, 100, theme.leaf);
  paintGround(ctx, view, state.groundY);

  if (state.oldTower) paintTower(ctx, view, state, state.oldTower, Math.max(0, Math.min(1, (2.2 - state.oldTower.toppledAgo) / 0.8)));
  paintTower(ctx, view, state, state.tower, 1);

  // The child stands behind the slingshot.
  paintShadow(ctx, view, state.pouch.x - 85, state.groundY + 4, 80);
  const pulling = state.drag ? Math.min(1, Math.hypot(state.drag.pull.x, state.drag.pull.y) / 150) : 0;
  sprites.draw(ctx, view.player, state.pouch.x - 85, state.groundY - 46, 92, { squash: [1 + 0.06 * pulling, 1 - 0.06 * pulling] });

  const waiting = !state.stone && state.stonesLeft > 0;
  paintSlingshot(ctx, view, state, true);
  if (waiting) {
    const pull = state.drag?.pull ?? { x: 0, y: 0 };
    if (state.drag) {
      ctx.fillStyle = theme.light;
      ctx.strokeStyle = theme.ink;
      ctx.lineWidth = 3;
      aimDots(state, pull, 8, 0.38).forEach((p, i) => {
        ctx.globalAlpha = 1 - i / 9;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 9 - i * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
    const held = heldStone(state, pull);
    sprites.draw(ctx, 'rock', held.x, held.y, STONE_RADIUS * 2.6);
  }
  paintSlingshot(ctx, view, state, false);

  const stone = state.stone;
  if (stone) {
    paintShadow(ctx, view, stone.x, state.groundY + 4, 44, (state.groundY - stone.y) / 300);
    sprites.draw(ctx, 'rock', stone.x, stone.y, STONE_RADIUS * 2.6, { rotate: view.reducedMotion ? 0 : stone.t * 10 });
  }

  // Stones left, on the grass under the slingshot.
  const left = state.stonesLeft - (waiting ? 1 : 0);
  for (let i = 0; i < left; i += 1) sprites.draw(ctx, 'rock', 34 + i * 34, state.groundY + 40, 34);
  if (state.stonesLeft === STONES && !state.drag && state.time < 5) paintLabel(ctx, view, 'Kéo ngược ra sau rồi thả!', Math.min(arena.width / 2, state.pouch.x + 220), state.pouch.y - 120, 30);
  if (state.tower.toppled && state.tower.toppledAgo < 1) {
    const grow = view.reducedMotion ? 1 : Math.min(1, state.tower.toppledAgo / 0.15);
    paintLabel(ctx, view, 'Đổ rồi!', arena.width / 2, HUD_SAFE_TOP + 60, 60 * grow, theme.star);
  }
}
