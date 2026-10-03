// Pétanque's picture: a gravel court seen from above with a wooden border and the throwing circle near the
// bottom. The small gold jack, the child's steel balls (pink ring) and the owl's (blue ring), each with a soft
// shadow. A ball in the air grows as it rises and shrinks as it falls; while the child pulls, a dotted line
// and a ring show where her ball will land. The owl sits at the side; the end's points show when it is scored.
import { paintLabel, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { BALL_R, BALLS_EACH, JACK_R, landing, type Ball, type PetanqueState } from './logic';

function paintBall(ctx: CanvasRenderingContext2D, view: DrawView, owner: Ball['owner'], x: number, y: number, scale = 1): void {
  const { theme } = view;
  const r = (owner === 'jack' ? JACK_R : BALL_R) * scale;
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 5, r, r * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = owner === 'jack' ? theme.star : theme.stone;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = owner === 'jack' ? 2 : 5;
  ctx.strokeStyle = owner === 'child' ? theme.primary : owner === 'owl' ? theme.secondary : theme.ink;
  ctx.stroke();
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawPetanque(ctx: CanvasRenderingContext2D, state: PetanqueState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.leaf;
  ctx.fillRect(0, 0, arena.width, arena.height);
  const c = state.court;
  ctx.fillStyle = theme.ground;
  roundRect(ctx, c.left - 10, c.top - 10, c.right - c.left + 20, c.bottom - c.top + 20, 12);
  ctx.fill();
  ctx.fillStyle = theme.groundDeep;
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 160; i += 1) {
    const x = c.left + ((i * 97) % (c.right - c.left));
    const y = c.top + ((i * 61) % (c.bottom - c.top));
    ctx.fillRect(x, y, 4, 3);
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 8;
  roundRect(ctx, c.left - 10, c.top - 10, c.right - c.left + 20, c.bottom - c.top + 20, 12);
  ctx.stroke();
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(state.thrower.x, state.thrower.y, 34, 0, Math.PI * 2);
  ctx.stroke();

  for (const b of state.balls) paintBall(ctx, view, b.owner, b.x, b.y);

  // The pull: a dotted line and the landing ring.
  if (state.aimFrom && state.aimTo && state.aimFrom.y - state.aimTo.y > 10) {
    const to = landing(state, state.aimFrom, state.aimTo);
    ctx.setLineDash([8, 10]);
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(state.thrower.x, state.thrower.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = theme.primary;
    ctx.beginPath();
    ctx.arc(to.x, to.y, BALL_R + 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  const f = state.flight;
  if (f) {
    const t = f.age / 0.75;
    paintBall(ctx, view, f.owner, f.from.x + (f.to.x - f.from.x) * t, f.from.y + (f.to.y - f.from.y) * t - Math.sin(t * Math.PI) * 60, 1 + Math.sin(t * Math.PI) * 0.6);
  } else if (state.turn === 'child' && state.phase === 'play' && state.thrown.child < BALLS_EACH) {
    paintBall(ctx, view, 'child', state.thrower.x, state.thrower.y);
  }

  // Players and balls left.
  const left = (who: 'child' | 'owl'): number => BALLS_EACH - state.thrown[who];
  sprites.draw(ctx, 'owl', c.right - 30, HUD_SAFE_TOP + 40, 64);
  for (let i = 0; i < left('owl'); i += 1) paintBall(ctx, view, 'owl', c.right - 80 - i * 30, HUD_SAFE_TOP + 44, 0.7);
  sprites.draw(ctx, view.player, c.left + 30, c.bottom - 40, 64);
  for (let i = 0; i < left('child'); i += 1) paintBall(ctx, view, 'child', c.left + 80 + i * 30, c.bottom - 36, 0.7);
  if (state.phase === 'scored' && state.lastEnd) {
    const { child, owl } = state.lastEnd;
    paintLabel(ctx, view, child > 0 ? `+${child} điểm!` : owl > 0 ? `Bạn Cú +${owl}` : 'Hòa!', arena.width / 2, (c.top + c.bottom) / 2, 44, child > 0 ? theme.star : theme.light);
  } else if (state.turn === 'child' && !state.flight && state.thrown.child === 0 && state.ends === 1) {
    paintLabel(ctx, view, 'Kéo lên rồi thả tay', arena.width / 2, state.thrower.y - 90, 28);
  }
}
