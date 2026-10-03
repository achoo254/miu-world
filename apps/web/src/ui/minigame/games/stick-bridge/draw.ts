// Stick bridge's picture: sky and far hills, a stream flowing along the bottom, stone pillars with mossy tops
// (the next one has a red mark in its middle), the green bamboo pole with its joints, the child on her
// pillar, and a ripple where a dropped pole hit the water. A hint hand pulses before the first pole.
import { bob, paintHills, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import type { Pillar, StickBridgeState } from './logic';

const POLE_WIDTH = 14;

function paintStream(ctx: CanvasRenderingContext2D, view: DrawView, y: number, cameraX: number): void {
  const { arena, theme } = view;
  ctx.fillStyle = theme.water;
  ctx.fillRect(0, y, arena.width, arena.height - y);
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.8;
  const flow = view.reducedMotion ? 0 : view.time * 40;
  for (let row = 0; row < 4; row += 1) {
    const ry = y + 24 + row * 38;
    if (ry > arena.height) break;
    const shift = (cameraX * 0.5 + flow * (1 + row * 0.2)) % 120;
    ctx.beginPath();
    for (let x = -120 - shift; x < arena.width + 120; x += 120) {
      ctx.moveTo(x, ry);
      ctx.lineTo(x + 46, ry);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function paintPillar(ctx: CanvasRenderingContext2D, view: DrawView, p: Pillar, top: number, cameraX: number, marked: boolean): void {
  const { arena, theme } = view;
  const x = p.x - cameraX;
  if (x > arena.width + 10 || x + p.width < -10) return;
  ctx.fillStyle = theme.stone;
  ctx.strokeStyle = theme.stoneEdge;
  ctx.lineWidth = 4;
  roundRect(ctx, x, top, p.width, arena.height - top + 20, 10);
  ctx.fill();
  ctx.stroke();
  // Stone blocks and a mossy top.
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  for (let y = top + 60; y < arena.height; y += 60) {
    ctx.moveTo(x + 4, y);
    ctx.lineTo(x + p.width - 4, y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = theme.leaf;
  roundRect(ctx, x - 4, top - 6, p.width + 8, 18, 9);
  ctx.fill();
  if (marked) {
    ctx.fillStyle = theme.danger;
    roundRect(ctx, x + p.width / 2 - 12, top - 8, 24, 10, 4);
    ctx.fill();
  }
}

function paintPole(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, length: number, angle: number): void {
  if (length <= 0) return;
  const { theme } = view;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = theme.leaf;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  roundRect(ctx, -POLE_WIDTH / 2, -length, POLE_WIDTH, length, 6);
  ctx.fill();
  ctx.stroke();
  // Bamboo joints.
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.45;
  for (let d = 36; d < length - 6; d += 42) ctx.fillRect(-POLE_WIDTH / 2, -d, POLE_WIDTH, 4);
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawStickBridge(ctx: CanvasRenderingContext2D, state: StickBridgeState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { pillarTop, cameraX } = state;
  const streamY = pillarTop + 70;
  paintSky(ctx, view, streamY, 8);
  paintHills(ctx, view, streamY - 40, cameraX * 0.2, 120, theme.waterLight);
  paintHills(ctx, view, streamY, cameraX * 0.4 + 300, 70, theme.leaf);
  paintStream(ctx, view, streamY, cameraX);

  paintPillar(ctx, view, state.here, pillarTop, cameraX, false);
  paintPillar(ctx, view, state.next, pillarTop, cameraX, true);

  const edge = state.here.x + state.here.width - cameraX;
  const dropping = state.phase === 'dropping';
  if (dropping) ctx.globalAlpha = Math.max(0, 1 - state.phaseTime / 0.8);
  paintPole(ctx, view, edge, pillarTop, state.length, state.angle);
  ctx.globalAlpha = 1;
  if (dropping && state.phaseTime > 0.3) {
    // Ripples where it hit the water.
    const t = Math.min(1, (state.phaseTime - 0.3) / 0.5);
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 1 - t;
    ctx.beginPath();
    ctx.ellipse(edge + 20, streamY + 40, 20 + 60 * t, 6 + 14 * t, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // The child: walking bob on the pole, a hop of joy on arrival, a little shrug after a drop.
  const px = state.playerX - cameraX;
  const walking = state.phase === 'walking' && !view.reducedMotion ? Math.abs(Math.sin(state.phaseTime * 14)) * 8 : 0;
  const joy = state.phase === 'scrolling' && !view.reducedMotion ? Math.sin(Math.min(1, state.phaseTime / 0.35) * Math.PI) * 24 : 0;
  paintShadow(ctx, view, px, pillarTop + 4, 60);
  sprites.draw(ctx, view.player, px, pillarTop - 46 - walking - joy, 92, { rotate: dropping && !view.reducedMotion ? Math.sin(state.phaseTime * 18) * 0.08 : 0 });

  if (state.tries === 0 && state.phase === 'ready') {
    // Before the first pole: a hand pressing, and the words for it.
    const press = view.reducedMotion ? 0 : (Math.sin(view.time * 5) + 1) * 6;
    sprites.draw(ctx, 'sparkles', edge, pillarTop - 150 + bob(view, 4, 6), 60);
    paintLabel(ctx, view, 'Giữ ngón tay để tre dài ra', arena.width / 2, Math.min(arena.height - 40, pillarTop + 130) + press * 0.2, 34);
  }
}
