// Hanoi tower's picture: a kitchen table under the sky, three cake stands (the target one has a star over it),
// cake layers in the theme's colours with cream on top and a strawberry on the smallest. A lifted layer
// floats over its stand; while one is lifted the stands it may go on glow. A dropped layer falls into place;
// a wrong stand wobbles. The move count and the fewest moves are written above.
import { bob, paintGround, paintHills, paintLabel, paintShadow, paintSky, roundRect } from '../../draw-kit';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import { DROP_SECONDS, layerWidth, type HanoiState } from './logic';

const MAX_SHOWN = 5;

function layerColour(view: DrawView, size: number): string {
  const { theme } = view;
  const colours = [theme.danger, theme.star, theme.leaf, theme.secondary, theme.primary];
  return colours[(size - 1) % colours.length] ?? theme.primary;
}

function paintLayer(ctx: CanvasRenderingContext2D, view: DrawView, state: HanoiState, size: number, cx: number, bottom: number): void {
  const { theme, sprites } = view;
  const w = layerWidth(state, size);
  const h = state.layerH - 4;
  const x = cx - w / 2;
  const y = bottom - h;
  ctx.fillStyle = layerColour(view, size);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 4;
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.stroke();
  // Cream along the top with a few drips.
  ctx.fillStyle = theme.light;
  roundRect(ctx, x + 4, y + 3, w - 8, h * 0.32, 10);
  ctx.fill();
  for (let i = 1; i < 4; i += 1) {
    ctx.beginPath();
    ctx.arc(x + (w * i) / 4, y + h * 0.32, 7, 0, Math.PI);
    ctx.fill();
  }
  if (size === 1) sprites.draw(ctx, 'strawberry', cx, y - 14, 40);
}

export function drawHanoiTower(ctx: CanvasRenderingContext2D, state: HanoiState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const tableY = state.baseY + 18;
  paintSky(ctx, view, tableY, 6);
  paintHills(ctx, view, tableY - 40, 40, 90, theme.leaf);
  paintGround(ctx, view, tableY);
  const poleTop = state.baseY - state.layerH * (MAX_SHOWN + 0.7);
  const hoverY = state.baseY - state.layerH * (MAX_SHOWN + 1.2);
  const held = state.held;
  const heldSize = held === null ? undefined : state.stands[held]?.at(-1);

  state.standX.forEach((x, i) => {
    const wobble = state.wobble?.stand === i && !view.reducedMotion ? Math.sin(state.wobble.t * 40) * 8 * (1 - state.wobble.t / 0.5) : 0;
    const sx = x + wobble;
    const stack = state.stands[i] ?? [];
    const plateW = Math.min(state.maxW + 34, arena.width / 3 - 12);
    // Where the lifted layer may go: a soft glow on the plate.
    const allowed = heldSize !== undefined && held !== i && (stack.at(-1) ?? 99) > heldSize;
    if (allowed) {
      ctx.globalAlpha = 0.35 + (view.reducedMotion ? 0 : 0.15 * Math.sin(view.time * 6));
      ctx.fillStyle = theme.star;
      roundRect(ctx, sx - plateW / 2 - 10, poleTop - 10, plateW + 20, state.baseY - poleTop + 34, 26);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    paintShadow(ctx, view, sx, tableY + 6, plateW * 0.9);
    // Pedestal, plate, pole.
    ctx.fillStyle = theme.woodEdge;
    roundRect(ctx, sx - 24, state.baseY, 48, 22, 6);
    ctx.fill();
    ctx.fillStyle = theme.wood;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    roundRect(ctx, sx - 7, poleTop, 14, state.baseY - poleTop, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = i === state.target ? theme.star : theme.light;
    roundRect(ctx, sx - plateW / 2, state.baseY - 6, plateW, 16, 8);
    ctx.fill();
    ctx.stroke();
    if (i === state.target) sprites.draw(ctx, 'star', sx, poleTop - 30 + bob(view, 3, 5), 58);

    stack.forEach((size, level) => {
      const isTop = level === stack.length - 1;
      if (isTop && held === i) return;
      const last = state.last;
      if (isTop && last && last.to === i && last.size === size && last.t < DROP_SECONDS) {
        // Falling from where it floated to its place.
        const p = last.t / DROP_SECONDS;
        const fromX = state.standX[last.from] ?? sx;
        const endY = state.baseY - 6 - level * state.layerH;
        paintLayer(ctx, view, state, size, fromX + (sx - fromX) * p, hoverY + (endY - hoverY) * p * p);
        return;
      }
      paintLayer(ctx, view, state, size, sx, state.baseY - 6 - level * state.layerH);
    });
  });

  if (held !== null && heldSize !== undefined) {
    const x = state.standX[held] ?? 0;
    paintLayer(ctx, view, state, heldSize, x, hoverY + bob(view, 5, 6));
  }

  const labelY = HUD_SAFE_TOP + 30;
  if (state.nextIn > 0) {
    const grow = view.reducedMotion ? 1 : Math.min(1, (1.4 - state.nextIn) / 0.2);
    paintLabel(ctx, view, 'Xong rồi!', arena.width / 2, labelY + 10, 54 * Math.max(0.2, grow), theme.star);
    const tx = state.standX[state.target] ?? arena.width / 2;
    sprites.draw(ctx, 'party-popper', tx + 70, poleTop - 20, 70, { alpha: Math.min(1, state.nextIn) });
  } else {
    paintLabel(ctx, view, `Bước ${state.moves} · ít nhất ${state.best}`, arena.width / 2, labelY, 30);
  }
}
