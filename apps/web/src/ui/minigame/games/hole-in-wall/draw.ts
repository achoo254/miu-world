// Hole in the wall's picture: a TV-show stage with a floor running back to the horizon. The foam wall (pink,
// with soft stripes) comes from far away, growing, with a dark body-shaped hole; the child's character stands
// near the front in her pose, drawn as thick limbs with her own face as the head. A wall she gets through
// sweeps past and fades; a wrong pose tips her over backwards for a moment. Big round pose buttons along the
// bottom show each pose as a little figure; the current one is ringed in gold.
import { paintLabel, paintSky } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView, type Point } from '../../types';
import { FIGURES, type Figure, type HoleState } from './logic';

function strokeFigure(ctx: CanvasRenderingContext2D, figure: Figure, at: Point, size: number, width: number, colour: string, headColour: string | null): void {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const limb of figure.limbs) {
    ctx.beginPath();
    limb.forEach((p, i) => {
      const x = at.x + p.x * size;
      const y = at.y + p.y * size;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  if (headColour) {
    ctx.fillStyle = headColour;
    ctx.beginPath();
    ctx.arc(at.x + figure.head.x * size, at.y + figure.head.y * size, size * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineCap = 'butt';
}

export function drawHoleInWall(ctx: CanvasRenderingContext2D, state: HoleState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const horizon = HUD_SAFE_TOP + 40;
  paintSky(ctx, view, horizon, 6);
  // The stage floor, running back to the horizon.
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, horizon, arena.width, arena.height - horizon);
  ctx.strokeStyle = theme.groundDeep;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.5;
  for (let i = -4; i <= 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(arena.width / 2 + i * 30, horizon);
    ctx.lineTo(arena.width / 2 + i * 260, arena.height);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const H = state.height;
  const wall = state.wall;
  const paintWall = (): void => {
    if (!wall) return;
    const z = Math.min(wall.z, 1.4);
    const near = wall.through === false ? Math.min(z, 1) : z;
    const scale = 0.18 + 0.82 * near * near;
    const bottom = horizon + (state.feet.y + 20 - horizon) * near * near;
    const w = H * 1.55 * scale;
    const h = H * 1.3 * scale;
    const fade = wall.z > 1 ? Math.max(0, 1 - (wall.z - 1) * 3) : 1;
    ctx.globalAlpha = fade;
    ctx.fillStyle = theme.primary;
    ctx.fillRect(state.feet.x - w / 2, bottom - h, w, h);
    ctx.fillStyle = theme.light;
    ctx.globalAlpha = fade * 0.18;
    for (let k = 1; k < 6; k += 2) ctx.fillRect(state.feet.x - w / 2, bottom - h + (h * k) / 6, w, h / 12);
    ctx.globalAlpha = fade;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4 * scale;
    ctx.strokeRect(state.feet.x - w / 2, bottom - h, w, h);
    const figure = FIGURES[wall.pose];
    strokeFigure(ctx, figure, { x: state.feet.x, y: bottom - 10 * scale }, H * scale, H * 0.17 * scale, theme.ink, theme.ink);
    ctx.globalAlpha = 1;
  };

  // A wall still coming is behind the character; one going past is in front of her.
  const inFront = wall !== null && wall.z > 1 && wall.through === true;
  if (!inFront) paintWall();

  const fall = state.pushedAgo < 0.9 && !view.reducedMotion ? Math.sin(Math.min(1, state.pushedAgo / 0.9) * Math.PI) * 0.9 : 0;
  const hop = state.posedAgo < 0.2 && !view.reducedMotion ? Math.sin((state.posedAgo / 0.2) * Math.PI) * 14 : 0;
  ctx.save();
  ctx.translate(state.feet.x, state.feet.y - hop);
  ctx.rotate(-fall);
  const figure = FIGURES[state.pose];
  strokeFigure(ctx, figure, { x: 0, y: 0 }, H, H * 0.11, theme.secondary, null);
  sprites.draw(ctx, view.player, figure.head.x * H, figure.head.y * H, H * 0.34);
  ctx.restore();

  if (inFront) paintWall();

  // Pose buttons.
  for (const b of state.buttons) {
    const on = b.pose === state.pose;
    ctx.fillStyle = on ? theme.star : theme.light;
    ctx.beginPath();
    ctx.arc(b.at.x, b.at.y, state.buttonRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = on ? 6 : 4;
    ctx.stroke();
    const r = state.buttonRadius;
    strokeFigure(ctx, FIGURES[b.pose], { x: b.at.x, y: b.at.y + r * 0.62 }, r * 1.15, r * 0.14, theme.ink, theme.ink);
  }
  if (state.walls === 0) paintLabel(ctx, view, 'Chạm nút để đổi tư thế!', arena.width / 2, horizon + 40, 30);
}
