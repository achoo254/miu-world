// Balloon rule pop's picture: a sky over a fairground, balloons of four colours each carrying its sign, the
// banner at the top showing the balloon to pop (it pulses when the rule changes, a bar shows time to the
// next change), popped balloons bursting into scraps, and a wrongly tapped balloon wobbling with a red rim.
import { bob, paintGround, paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { SIGNS, type Balloon, type BalloonRulePopState } from './logic';

const colourOf = (view: DrawView, colour: number): string => [view.theme.primary, view.theme.secondary, view.theme.star, view.theme.leaf][colour] ?? view.theme.primary;

function paintBalloon(ctx: CanvasRenderingContext2D, view: DrawView, b: Balloon, x: number, y: number, r: number): void {
  const { theme } = view;
  const sway = view.reducedMotion ? 0 : Math.sin(view.time * 2 + b.phase) * 0.08;
  const wobble = b.wrongAgo < 0.4 && !view.reducedMotion ? Math.sin(b.wrongAgo * 50) * 0.25 * (1 - b.wrongAgo / 0.4) : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sway + wobble);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, r * 1.2);
  ctx.quadraticCurveTo(10, r * 1.6, -4, r * 2.1);
  ctx.stroke();
  ctx.fillStyle = colourOf(view, b.colour);
  ctx.strokeStyle = b.wrongAgo < 0.5 ? theme.danger : theme.ink;
  ctx.lineWidth = b.wrongAgo < 0.5 ? 7 : 4;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 1.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.ink;
  ctx.beginPath();
  ctx.moveTo(-r * 0.14, r * 1.22);
  ctx.lineTo(r * 0.14, r * 1.22);
  ctx.lineTo(0, r * 1.08);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  ctx.ellipse(-r * 0.4, -r * 0.45, r * 0.16, r * 0.28, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  view.sprites.draw(ctx, SIGNS[b.colour] ?? 'star', 0, r * 0.05, r * 0.95);
  ctx.restore();
}

function paintBanner(ctx: CanvasRenderingContext2D, view: DrawView, state: BalloonRulePopState): void {
  const { arena, theme } = view;
  const fresh = state.ruleAgo < 1.2;
  const pulse = fresh && !view.reducedMotion ? 1 + Math.sin(state.ruleAgo * 14) * 0.06 : 1;
  const w = 330;
  const h = 76;
  const x = arena.width / 2;
  const y = HUD_SAFE_TOP + 4;
  ctx.save();
  ctx.translate(x, y + h / 2);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = theme.light;
  ctx.strokeStyle = fresh ? colourOf(view, state.rule) : theme.ink;
  ctx.lineWidth = fresh ? 8 : 5;
  roundRect(ctx, -w / 2, -h / 2, w, h, 22);
  ctx.fill();
  ctx.stroke();
  paintLabel(ctx, view, 'Nổ bóng', -55, 0, 38, theme.star);
  const sample: Balloon = { x: 0, y: 0, vy: 0, r: 26, colour: state.rule, popped: -1, wrongAgo: 9, phase: 0 };
  paintBalloon(ctx, view, sample, 100, -6, 26);
  // Time to the next change.
  ctx.fillStyle = colourOf(view, state.rule);
  ctx.fillRect(-w / 2 + 16, h / 2 - 12, (w - 32) * (1 - state.ruleAgo / state.ruleSeconds), 6);
  ctx.restore();
  if (fresh) paintLabel(ctx, view, 'Đổi màu!', x, y + h + 34, 36, colourOf(view, state.rule));
}

export function drawBalloonRulePop(ctx: CanvasRenderingContext2D, state: BalloonRulePopState, view: DrawView): void {
  const { arena, theme } = view;
  const groundY = arena.height - 50;
  paintSky(ctx, view, groundY, 8);
  paintHills(ctx, view, groundY, view.time * 4, 70, theme.leaf);
  paintGround(ctx, view, groundY);
  for (const b of state.balloons) {
    if (b.popped < 0) {
      paintBalloon(ctx, view, b, b.x, b.y + bob(view, 2, 4, b.phase), b.r);
      continue;
    }
    const t = b.popped / 0.4;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = colourOf(view, b.colour);
    for (let i = 0; i < 7; i += 1) {
      const a = (i / 7) * Math.PI * 2;
      ctx.fillRect(b.x + Math.cos(a) * (20 + t * 90) - 7, b.y + Math.sin(a) * (20 + t * 90) + t * 40, 14, 9);
    }
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * (0.6 + t), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  paintBanner(ctx, view, state);
}
