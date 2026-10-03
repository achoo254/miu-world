// Pitch stairs' picture: a blue ice cave, eight icicles along the top (long and low on the left, short and high
// on the right) that glow and wobble as they ring, an icy staircase the child climbs in the middle, and two big
// arrow buttons below. After a wrong answer an arrow between the two icicles shows which way the tune went.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { SCALE, type PitchButton, type PitchState } from './logic';

function paintArrowButton(ctx: CanvasRenderingContext2D, view: DrawView, b: PitchButton, pressed: number, active: boolean): void {
  const { theme } = view;
  const r = b.r * (1 - pressed * 0.08);
  ctx.globalAlpha = active ? 1 : 0.55;
  ctx.fillStyle = b.dir === 'up' ? theme.primary : theme.secondary;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const s = b.dir === 'up' ? -1 : 1;
  ctx.fillStyle = theme.light;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y + s * r * 0.55);
  ctx.lineTo(b.x - r * 0.45, b.y - s * r * 0.05);
  ctx.lineTo(b.x - r * 0.18, b.y - s * r * 0.05);
  ctx.lineTo(b.x - r * 0.18, b.y - s * r * 0.5);
  ctx.lineTo(b.x + r * 0.18, b.y - s * r * 0.5);
  ctx.lineTo(b.x + r * 0.18, b.y - s * r * 0.05);
  ctx.lineTo(b.x + r * 0.45, b.y - s * r * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.globalAlpha = 1;
  paintLabel(ctx, view, b.dir === 'up' ? 'Cao hơn' : 'Thấp hơn', b.x, b.y - r - 22, 26, theme.light);
}

/** Length of the lowest icicle: longer on tall screens. */
const icicleLength = (view: DrawView): number => Math.min(230, view.arena.height * 0.27);

export function drawPitchStairs(ctx: CanvasRenderingContext2D, state: PitchState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const cave = ctx.createLinearGradient(0, 0, 0, arena.height);
  cave.addColorStop(0, theme.water);
  cave.addColorStop(1, theme.waterLight);
  ctx.fillStyle = cave;
  ctx.fillRect(0, 0, arena.width, arena.height);
  // Cave roof with a lumpy snowy edge.
  const roofY = state.icicles[0]?.y ?? 120;
  ctx.fillStyle = theme.light;
  ctx.fillRect(0, 0, arena.width, roofY);
  for (let x = 0; x < arena.width + 40; x += 56) {
    ctx.beginPath();
    ctx.arc(x, roofY, 22 + ((x / 56) % 3) * 6, 0, Math.PI);
    ctx.fill();
  }

  // Icicles: length falls with pitch.
  const longest = icicleLength(view);
  state.icicles.forEach((ic, i) => {
    const len = longest * (1 - (i / (SCALE.length - 1)) * 0.6);
    const glow = Math.max(0, 1 - (state.rangAgo[i] ?? 99) / 0.7);
    const sway = view.reducedMotion ? 0 : Math.sin((state.rangAgo[i] ?? 0) * 30) * 6 * glow;
    ctx.fillStyle = theme.light;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ic.x - 26, ic.y);
    ctx.lineTo(ic.x + 26, ic.y);
    ctx.lineTo(ic.x + sway, ic.y + len);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (glow > 0) {
      ctx.globalAlpha = glow;
      ctx.fillStyle = theme.star;
      ctx.fill();
      ctx.globalAlpha = glow * 0.5;
      ctx.beginPath();
      ctx.arc(ic.x, ic.y + len * 0.45, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      sprites.draw(ctx, 'musical-note', ic.x + 30, ic.y + len - 10 - (state.rangAgo[i] ?? 0) * 60, 44, { alpha: glow });
    }
  });

  // The staircase between the arrows: the child stands on her step, a few steps around her drawn.
  const [up, down] = state.buttons;
  const wide = (up?.y ?? 0) < arena.height - 120;
  const icicleBottom = roofY + longest;
  const stairBase = wide ? arena.height - 20 : (up?.y ?? arena.height) - (up?.r ?? 60) - 60;
  const stepW = wide ? 74 : 92;
  const stepH = wide ? 40 : 58;
  const climb = Math.min(1, state.climbAgo / 0.35);
  const shown = state.steps - 1 + climb;
  const centreX = arena.width / 2 - stepW * 0.5;
  const standY = wide ? stairBase - 90 : icicleBottom + (stairBase - icicleBottom) * 0.62;
  for (let k = Math.max(0, state.steps - 3); k < state.steps + 3; k += 1) {
    const x = centreX + (k - shown) * stepW - stepW * 0.5;
    const y = standY - (k - shown) * stepH;
    if (x < -stepW || x > arena.width) continue;
    ctx.fillStyle = k % 2 === 0 ? theme.light : theme.waterLight;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 3;
    roundRect(ctx, x, y, stepW, Math.max(10, stairBase - y), 6);
    ctx.fill();
    ctx.stroke();
  }
  const hop = view.reducedMotion ? 0 : Math.sin(climb * Math.PI) * 26;
  sprites.draw(ctx, view.player, centreX, standY - 38 - hop, 84);
  paintLabel(ctx, view, `Bậc ${state.steps}`, centreX, wide ? stairBase - 12 : standY + 40, 28, theme.star);

  // After a wrong answer: which way the tune went.
  if (state.phase === 'wrong') {
    const a = state.icicles[state.first];
    const b = state.icicles[state.second];
    if (a && b) {
      const y = a.y + longest + 26;
      ctx.strokeStyle = theme.danger;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(a.x, y);
      ctx.lineTo(b.x, y);
      ctx.lineTo(b.x - Math.sign(b.x - a.x) * 18, y - 14);
      ctx.moveTo(b.x, y);
      ctx.lineTo(b.x - Math.sign(b.x - a.x) * 18, y + 14);
      ctx.stroke();
      paintLabel(ctx, view, state.second > state.first ? 'Nốt sau cao hơn' : 'Nốt sau thấp hơn', arena.width / 2, y + 44, 30, theme.light);
    }
  }
  for (const b of [up, down]) {
    if (!b) continue;
    const pressed = state.pressed === b.dir ? Math.max(0, 1 - (state.time - state.pressedAt) / 0.2) : 0;
    paintArrowButton(ctx, view, b, pressed, state.phase === 'answer');
  }
}
