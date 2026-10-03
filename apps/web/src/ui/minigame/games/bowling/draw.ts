// Bowling's picture: the lane in perspective (wooden boards, aiming arrows, gutters on both sides), the pin
// deck at the far end under a dark back wall, ten pins (white with red stripes) that tip over when knocked,
// the ball waiting on the foul line or rolling (spinning finger holes), the frame boxes along the bottom and a
// big word for a strike, a spare or a gutter ball.
import { paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { BALL_RADIUS, FRAMES, HEAD_PIN_V, LANE_END, LANE_HALF, PIN_RADIUS, toScreen, type BowlingState, type Pin } from './logic';

const CALL_WORDS = { strike: 'Đổ hết!', spare: 'Dọn sạch!', gutter: 'Rơi rãnh rồi!' } as const;

function quad(ctx: CanvasRenderingContext2D, s: BowlingState, u0: number, u1: number, v0: number, v1: number): void {
  const a = toScreen(s, u0, v0);
  const b = toScreen(s, u1, v0);
  const c = toScreen(s, u1, v1);
  const d = toScreen(s, u0, v1);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
}

function paintLane(ctx: CanvasRenderingContext2D, view: DrawView, s: BowlingState): void {
  const { theme, arena } = view;
  const end = LANE_END + 20;
  const far = toScreen(s, 0, end);
  // Back wall above the pin deck.
  ctx.fillStyle = theme.ink;
  ctx.fillRect(0, 0, arena.width, far.y + 4);
  ctx.fillStyle = theme.primary;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(0, far.y - 40, arena.width, 10);
  ctx.globalAlpha = 1;
  // Approach floor below the foul line, and the floor beside the lane.
  ctx.fillStyle = theme.woodEdge;
  ctx.fillRect(0, far.y, arena.width, arena.height - far.y);
  ctx.fillStyle = theme.wood;
  ctx.fillRect(0, s.view.nearY, arena.width, arena.height - s.view.nearY);
  // Gutters.
  ctx.fillStyle = theme.stoneEdge;
  quad(ctx, s, -LANE_HALF - 9, -LANE_HALF, -40, end);
  ctx.fill();
  quad(ctx, s, LANE_HALF, LANE_HALF + 9, -40, end);
  ctx.fill();
  // The lane: boards, a shine down the middle.
  ctx.fillStyle = theme.wood;
  quad(ctx, s, -LANE_HALF, LANE_HALF, -40, end);
  ctx.fill();
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.18;
  quad(ctx, s, -LANE_HALF * 0.35, LANE_HALF * 0.35, -40, end);
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 1.5;
  for (let u = -LANE_HALF + 3.5; u < LANE_HALF; u += 3.5) {
    const a = toScreen(s, u, -40);
    const b = toScreen(s, u, end);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Aiming arrows and the foul line.
  ctx.fillStyle = theme.danger;
  for (const u of [-14, -7, 0, 7, 14]) {
    const tip = toScreen(s, u, 160 + Math.abs(u) * 2);
    const l = toScreen(s, u - 1.6, 140 + Math.abs(u) * 2);
    const r = toScreen(s, u + 1.6, 140 + Math.abs(u) * 2);
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(l.x, l.y);
    ctx.lineTo(r.x, r.y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = theme.ink;
  quad(ctx, s, -LANE_HALF, LANE_HALF, -0.8, 0.8);
  ctx.fill();
  // Pin deck spots.
  ctx.fillStyle = theme.woodEdge;
  ctx.globalAlpha = 0.5;
  for (const p of s.pins) {
    const at = toScreen(s, p.home.x, p.home.y);
    const r = PIN_RADIUS * (s.view.nearHalf / LANE_HALF) * at.scale;
    ctx.beginPath();
    ctx.ellipse(at.x, at.y, r, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function paintPin(ctx: CanvasRenderingContext2D, view: DrawView, s: BowlingState, pin: Pin): void {
  const { theme } = view;
  const at = toScreen(s, pin.u, pin.v);
  const k = (s.view.nearHalf / LANE_HALF) * at.scale;
  // Drawn a little larger than their footprint, so the far pins read well.
  const w = PIN_RADIUS * k * 1.25;
  const h = w * 4.2;
  const tip = pin.down ? Math.min(1, pin.downAgo / 0.25) : 0;
  const side = pin.vu >= 0 ? 1 : -1;
  ctx.save();
  ctx.translate(at.x, at.y);
  paintShadow(ctx, view, 0, 0, w * 2.4, 0);
  ctx.globalAlpha = pin.gone ? Math.max(0, 1 - pin.downAgo / 0.4) : 1;
  ctx.rotate(side * tip * (view.reducedMotion ? 1.2 : 1.45));
  ctx.lineWidth = Math.max(1.5, w * 0.18);
  ctx.strokeStyle = theme.ink;
  ctx.fillStyle = theme.light;
  // Body, neck and head.
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.3, w, h * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  roundRect(ctx, -w * 0.45, -h * 0.75, w * 0.9, h * 0.35, w * 0.3);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -h * 0.82, w * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.danger;
  ctx.fillRect(-w * 0.48, -h * 0.66, w * 0.96, h * 0.05);
  ctx.fillRect(-w * 0.48, -h * 0.58, w * 0.96, h * 0.05);
  ctx.restore();
}

function paintBall(ctx: CanvasRenderingContext2D, view: DrawView, s: BowlingState, u: number, v: number, spin: number): void {
  const { theme } = view;
  const at = toScreen(s, u, v);
  const r = BALL_RADIUS * (s.view.nearHalf / LANE_HALF) * at.scale;
  paintShadow(ctx, view, at.x, at.y + r * 0.1, r * 2.2, 0);
  const cy = at.y - r * 0.9;
  ctx.fillStyle = theme.primary;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.beginPath();
  ctx.arc(at.x, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Finger holes roll over the top as it turns.
  const phase = (spin % 1) * Math.PI * 2;
  const hy = cy - Math.cos(phase) * r * 0.45;
  if (Math.cos(phase) > -0.2) {
    ctx.fillStyle = theme.ink;
    for (const [dx, dy] of [
      [-0.22, 0],
      [0.22, 0],
      [0, 0.32],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(at.x + dx * r, hy + dy * r * Math.cos(phase), r * 0.11, r * 0.11 * Math.max(0.3, Math.cos(phase)), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.arc(at.x - r * 0.35, cy - r * 0.4, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawBowling(ctx: CanvasRenderingContext2D, state: BowlingState, view: DrawView): void {
  const { arena, theme } = view;
  paintSky(ctx, view, arena.height, 0);
  paintLane(ctx, view, state);

  // Far things first: pins by depth, and the ball among them.
  const pins = state.pins.filter((p) => !p.gone || p.downAgo < 0.4).sort((a, b) => b.v - a.v);
  const ball = state.ball;
  let ballDrawn = false;
  for (const pin of pins) {
    if (ball && !ballDrawn && ball.v > pin.v) {
      paintBall(ctx, view, state, ball.u, ball.v, ball.t * 2.5);
      ballDrawn = true;
    }
    paintPin(ctx, view, state, pin);
  }
  if (ball && !ballDrawn && ball.v <= LANE_END + 40) paintBall(ctx, view, state, ball.u, ball.v, ball.t * 2.5);
  if (state.phase === 'aim' && !state.finished) {
    paintBall(ctx, view, state, state.aimU, 0, 0);
    if (state.frame === 0 && state.roll === 0) {
      const at = toScreen(state, 0, 120);
      paintLabel(ctx, view, 'Vuốt lên để lăn bóng', at.x, at.y, 30);
    }
  }

  // Frame boxes.
  const boxW = Math.min(90, (arena.width - 40) / FRAMES);
  const left = arena.width / 2 - (boxW * FRAMES) / 2;
  const y = arena.height - 62;
  for (let f = 0; f < FRAMES; f += 1) {
    const current = f === state.frame && !state.finished;
    ctx.fillStyle = current ? theme.star : theme.light;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    roundRect(ctx, left + f * boxW + 4, y, boxW - 8, 48, 12);
    ctx.fill();
    ctx.stroke();
    const points = state.framePoints[f];
    if (points !== undefined) paintLabel(ctx, view, String(points), left + f * boxW + boxW / 2, y + 25, 26);
  }

  if (state.lastCall && state.callAgo < 1.2) {
    const head = toScreen(state, 0, HEAD_PIN_V);
    const grow = view.reducedMotion ? 1 : Math.min(1, state.callAgo / 0.15);
    paintLabel(ctx, view, CALL_WORDS[state.lastCall], arena.width / 2, head.y + 70, 58 * grow, state.lastCall === 'gutter' ? theme.light : theme.star);
  }
}
