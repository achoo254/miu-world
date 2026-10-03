// Wipe clean's picture: a tiled wall over a sink, the thing being cleaned (mud blobs on it, then soap
// bubbles, then water drops, then a shine), the three steps as icons at the top with the current one lit
// and its words, the tool under the finger (soap bubbles, a water drop, a striped towel), and sparkles on a
// clean thing.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { cellCentre, GRID, progress, THINGS, TOOLS, type WipeState } from './logic';

const WORDS = ['Xoa xà phòng', 'Xả nước', 'Lau khô'] as const;

function paintTowel(ctx: CanvasRenderingContext2D, view: DrawView, x: number, y: number): void {
  const { theme } = view;
  ctx.fillStyle = theme.secondary;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 3;
  roundRect(ctx, x - 40, y - 28, 80, 56, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.light;
  ctx.fillRect(x - 40, y - 8, 80, 8);
  ctx.fillRect(x - 40, y + 10, 80, 5);
}

function paintTool(ctx: CanvasRenderingContext2D, view: DrawView, stage: number, x: number, y: number, size: number): void {
  if (stage === 0) view.sprites.draw(ctx, 'bubbles', x, y, size);
  else if (stage === 1) view.sprites.draw(ctx, 'droplet', x, y, size);
  else paintTowel(ctx, view, x, y);
}

export function drawWipeClean(ctx: CanvasRenderingContext2D, state: WipeState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  // Tiles and the sink.
  ctx.fillStyle = theme.light;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.strokeStyle = theme.waterLight;
  ctx.lineWidth = 2;
  for (let x = 0; x < arena.width; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, arena.height);
    ctx.stroke();
  }
  for (let y = 0; y < arena.height; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(arena.width, y);
    ctx.stroke();
  }
  const { cx, cy, size } = state;
  ctx.fillStyle = theme.stone;
  ctx.strokeStyle = theme.stoneEdge;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(cx, cy + size * 0.42, size * 0.62, size * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const leaving = state.stage >= TOOLS.length && state.pause >= 0 ? state.pause : 0;
  const offset = leaving * 900;
  sprites.draw(ctx, THINGS[state.thing] ?? 'dog-face', cx + offset, cy, size);
  if (offset === 0) {
    const cell = size / GRID;
    state.cells.forEach((c, i) => {
      if (c < 0 || c >= 3) return;
      const p = cellCentre(state, i);
      const wobble = ((i * 7) % 5) - 2;
      if (c === 0) {
        ctx.fillStyle = theme.groundDeep;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(p.x + wobble, p.y - wobble, cell * 0.62, 0, Math.PI * 2);
        ctx.fill();
      } else if (c === 1) {
        ctx.fillStyle = theme.light;
        ctx.strokeStyle = theme.waterLight;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(p.x + wobble, p.y, cell * 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.fillStyle = theme.water;
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.ellipse(p.x + wobble, p.y, cell * 0.14, cell * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
  }
  if (state.stage >= TOOLS.length) sprites.draw(ctx, 'sparkles', cx + size * 0.3 + offset, cy - size * 0.3, 90);

  // Steps across the top.
  const top = 150;
  TOOLS.forEach((_, i) => {
    const x = cx + (i - 1) * 110;
    ctx.fillStyle = i === state.stage ? theme.star : theme.stone;
    ctx.globalAlpha = i === state.stage ? 1 : 0.5;
    ctx.beginPath();
    ctx.arc(x, top, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    paintTool(ctx, view, i, x, top, 48);
    if (i < state.stage) sprites.draw(ctx, 'star', x + 26, top - 26, 28);
  });
  if (state.stage < TOOLS.length) {
    paintLabel(ctx, view, WORDS[state.stage] ?? '', cx, top + 60, 32);
    // How far along the step is.
    const w = 220;
    ctx.fillStyle = theme.ink;
    ctx.globalAlpha = 0.25;
    roundRect(ctx, cx - w / 2, cy + size / 2 + 30, w, 18, 9);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.leaf;
    roundRect(ctx, cx - w / 2, cy + size / 2 + 30, w * Math.min(1, progress(state)), 18, 9);
    ctx.fill();
  }
  if (state.finger && state.stage < TOOLS.length) paintTool(ctx, view, state.stage, state.finger.x, state.finger.y - 40, 70);
}
