// Lion dance's picture: a festival sky with a string of red lanterns, the lane the arrows rise up (each arrow a
// big coloured shape pointing its way), the ring at the top that pulses on the beat, a word for each step
// ("Tuyệt!", "Được!"), and the lion: the dragon-face head over a striped cloth body, dancing the latest step
// (a hop for up, a crouch for down, a lean for left and right), with the festival drum beside it.
import { bob, paintGround, paintHills, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import type { DrawView, SwipeDirection } from '../../types';
import { arrowY, type Arrow, type LionState } from './logic';

const ARROW_SIZE = 52;
const ANGLE: Readonly<Record<SwipeDirection, number>> = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 };
const WORDS = { perfect: 'Tuyệt!', good: 'Được!', miss: 'Hụt rồi' } as const;

function arrowColour(view: DrawView, dir: SwipeDirection): string {
  const { theme } = view;
  return dir === 'up' ? theme.primary : dir === 'down' ? theme.secondary : dir === 'left' ? theme.star : theme.danger;
}

/** A fat arrow pointing up (rotated for the other ways), tip at -size. */
function paintArrowShape(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number, dir: SwipeDirection, size: number, alpha: number, fill: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ANGLE[dir]);
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.9, 0);
  ctx.lineTo(size * 0.38, 0);
  ctx.lineTo(size * 0.38, size * 0.85);
  ctx.lineTo(-size * 0.38, size * 0.85);
  ctx.lineTo(-size * 0.38, 0);
  ctx.lineTo(-size * 0.9, 0);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 7;
  ctx.strokeStyle = view.theme.ink;
  ctx.stroke();
  if (fill) {
    ctx.fillStyle = arrowColour(view, dir);
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** A string of lanterns across the sky to the right of the lane (the lane and its ring stay clear). */
function paintLanterns(ctx: CanvasRenderingContext2D, view: DrawView, state: LionState, y: number): void {
  const { arena, theme, sprites } = view;
  const left = state.laneX + 110;
  const span = arena.width - left;
  if (span < 120) return;
  const sag = (x: number): number => Math.sin(((x - left) / span) * Math.PI) * 30;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(left, y - 30);
  for (let x = left; x <= arena.width; x += 20) ctx.lineTo(x, y - 30 + sag(x));
  ctx.stroke();
  const count = Math.max(2, Math.round(span / 150));
  for (let i = 0; i < count; i += 1) {
    const x = left + ((i + 0.5) / count) * span;
    sprites.draw(ctx, 'red-paper-lantern', x, y + 10 + sag(x) + bob(view, 2, 4, i), 58, { rotate: view.reducedMotion ? 0 : Math.sin(view.time * 1.5 + i) * 0.08 });
  }
}

function paintLion(ctx: CanvasRenderingContext2D, view: DrawView, state: LionState): void {
  const { theme, sprites } = view;
  const since = state.time - state.poseAt;
  const k = view.reducedMotion ? 0 : Math.max(0, 1 - since / 0.35);
  let dx = 0;
  let dy = 0;
  let tilt = 0;
  if (state.pose === 'up') dy = -60 * Math.sin(k * Math.PI);
  else if (state.pose === 'down') dy = 30 * k;
  else if (state.pose === 'left') {
    dx = -40 * k;
    tilt = -0.3 * k;
  } else if (state.pose === 'right') {
    dx = 40 * k;
    tilt = 0.3 * k;
  }
  const idle = bob(view, 5, 5);
  const x = state.lionX + dx;
  const y = state.lionY + dy + idle;
  paintShadow(ctx, view, state.lionX, state.lionY + 150, 220, -dy / 120);
  // The cloth body: striped, waving behind the head, with two pairs of legs.
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt * 0.5);
  const wave = view.reducedMotion ? 0 : Math.sin(view.time * 6) * 10;
  ctx.fillStyle = theme.danger;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-40, 10);
  ctx.quadraticCurveTo(-120, 40 + wave, -150, 110);
  ctx.lineTo(40, 110);
  ctx.quadraticCurveTo(60, 60 - wave, 40, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.star;
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.arc(-110 + i * 42, 80 + (i % 2) * 8 + wave * 0.3, 12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = theme.ink;
  for (const lx of [-130, -90, 0, 30]) {
    roundRect(ctx, lx, 104, 18, 40 - (state.pose === 'down' ? 12 * k : 0), 8);
    ctx.fill();
  }
  ctx.restore();
  sprites.draw(ctx, 'dragon-face', x + 10, y - 20, 170, { rotate: tilt, squash: state.pose === 'down' ? [1 + 0.1 * k, 1 - 0.1 * k] : [1, 1] });
  sprites.draw(ctx, 'drum', state.lionX + 120, state.lionY + 120, 90, { squash: since < 0.12 && !view.reducedMotion ? [1.08, 0.92] : [1, 1] });
}

function paintArrow(ctx: CanvasRenderingContext2D, view: DrawView, state: LionState, arrow: Arrow): void {
  if (arrow.judged === 'perfect' || arrow.judged === 'good') {
    // Hit: bursts bigger and fades at the ring.
    const t = (state.time - arrow.judgedAt) / 0.3;
    if (t < 1) paintArrowShape(ctx, view, state.laneX, state.ringY, arrow.dir, ARROW_SIZE * (1 + t * 0.6), 1 - t, true);
    return;
  }
  const y = arrowY(state, arrow);
  if (y > state.spawnY + 60 || y < -80) return;
  const faded = arrow.judged === 'miss' ? 0.3 : 1;
  paintArrowShape(ctx, view, state.laneX, y, arrow.dir, ARROW_SIZE, faded, true);
}

export function drawLionDance(ctx: CanvasRenderingContext2D, state: LionState, view: DrawView): void {
  const { arena, theme } = view;
  const groundY = state.lionY + 150;
  paintSky(ctx, view, groundY, 8);
  paintHills(ctx, view, groundY, 300, 80, theme.leaf);
  paintGround(ctx, view, groundY);
  paintLanterns(ctx, view, state, state.ringY - 20);

  // The lane.
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = theme.ink;
  roundRect(ctx, state.laneX - 74, state.ringY - 74, 148, arena.height - state.ringY + 120, 40);
  ctx.fill();
  ctx.globalAlpha = 1;

  // The ring pulses on each arrow's beat.
  const next = state.arrows.find((a) => a.judged === null);
  const sinceBeat = Math.min(...state.arrows.map((a) => (state.time >= a.at ? state.time - a.at : 9)));
  const pulse = view.reducedMotion ? 0 : Math.max(0, 1 - sinceBeat / 0.2) * 8;
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(state.laneX, state.ringY, 66 + pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 8;
  ctx.stroke();
  if (next) paintArrowShape(ctx, view, state.laneX, state.ringY, next.dir, ARROW_SIZE, 0.45, false);

  for (const arrow of state.arrows) paintArrow(ctx, view, state, arrow);

  paintLion(ctx, view, state);

  const since = state.time - state.judgementAt;
  if (state.judgement && since < 0.6) {
    const grow = view.reducedMotion ? 1 : Math.min(1, since / 0.1);
    paintLabel(ctx, view, WORDS[state.judgement], state.laneX + 150, state.ringY + 10, 44 * grow, state.judgement === 'miss' ? theme.light : theme.star);
  }
  if (state.combo >= 3) paintLabel(ctx, view, `${state.combo} liền!`, state.lionX - 40, state.lionY + 185, 38, theme.star);
}
