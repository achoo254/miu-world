// Đông Hồ print's picture: a workshop wall with a drying line under the HUD where finished prints hang (clean
// ones with a star), the belt, and the three carved blocks over it, each with its ink on the face (red, green,
// black) and a dashed guide down to the belt. The block for the next layer glows with an arrow; a press drops
// the block onto the paper. The dó sheet carries a red mark on its top edge and shows the layers printed so
// far, each exactly where it was pressed, so an early or late press really looks smudged.
import { paintLabel, roundRect } from '../../draw-kit';
import type { SpriteName } from '../../sprites';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { Print, PrintState } from './logic';

function layerColour(view: DrawView, layer: number): string {
  return [view.theme.danger, view.theme.leaf, view.theme.ink][layer] ?? view.theme.ink;
}

/** A print: paper, then each printed layer at its own offset (smudged ones paler). */
function paintPrint(ctx: CanvasRenderingContext2D, view: DrawView, picture: SpriteName, layers: readonly Print[], x: number, y: number, w: number): void {
  const { theme, sprites } = view;
  const h = w * 1.25;
  ctx.fillStyle = theme.light;
  roundRect(ctx, x - w / 2, y - h / 2, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 2;
  ctx.stroke();
  layers.forEach((l, i) => {
    if (l.offset === null) return;
    const dx = l.offset;
    ctx.globalAlpha = l.quality === 'smudge' ? 0.55 : 1;
    if (i === 0) {
      ctx.fillStyle = layerColour(view, 0);
      roundRect(ctx, x - w * 0.38 + dx, y - h * 0.36, w * 0.76, h * 0.72, w * 0.2);
      ctx.fill();
    } else if (i === 1) {
      ctx.fillStyle = layerColour(view, 1);
      for (let k = 0; k < 8; k += 1) {
        const a = (k / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(x + dx + Math.cos(a) * w * 0.4, y + Math.sin(a) * h * 0.4, w * 0.07, w * 0.04, a, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      sprites.draw(ctx, picture, x + dx, y + 4, w * 0.62, { alpha: l.quality === 'smudge' ? 0.55 : 1 });
    }
    ctx.globalAlpha = 1;
  });
}

export function drawDongHoPrint(ctx: CanvasRenderingContext2D, state: PrintState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.sky[2];
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.fillStyle = theme.wood;
  ctx.globalAlpha = 0.25;
  for (let x = 0; x < arena.width; x += 60) ctx.fillRect(x, 0, 30, arena.height);
  ctx.globalAlpha = 1;

  // The drying line with the last prints.
  const lineY = HUD_SAFE_TOP + 24;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, lineY);
  ctx.lineTo(arena.width, lineY);
  ctx.stroke();
  const thumb = 64;
  const shown = state.dried.slice(-Math.floor((arena.width - 20) / (thumb + 14)));
  shown.forEach((d, i) => {
    const x = 20 + thumb / 2 + i * (thumb + 14);
    paintPrint(ctx, view, d.picture, d.clean ? [{ offset: 0, quality: 'good' }, { offset: 0, quality: 'good' }, { offset: 0, quality: 'good' }] : [{ offset: 6, quality: 'smudge' }, { offset: -5, quality: 'smudge' }, { offset: 8, quality: 'smudge' }], x, lineY + thumb * 0.62 + 6, thumb);
    if (d.clean) sprites.draw(ctx, 'star', x + thumb * 0.4, lineY + 10, 26);
  });

  // The belt.
  const sheetH = state.sheetW * 1.25;
  const beltTop = state.beltY + sheetH / 2;
  ctx.fillStyle = theme.stoneEdge;
  ctx.fillRect(0, beltTop, arena.width, 26);
  ctx.fillStyle = theme.stone;
  const roll = view.reducedMotion ? 0 : (state.time * 150) % 40;
  for (let x = arena.width - roll; x > -20; x -= 40) {
    ctx.beginPath();
    ctx.arc(x, beltTop + 13, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // The sheet, with its red mark.
  const sheet = state.sheet;
  paintPrint(ctx, view, sheet.picture, sheet.layers, sheet.x, state.beltY, state.sheetW);
  ctx.fillStyle = theme.danger;
  ctx.beginPath();
  ctx.moveTo(sheet.x - 12, state.beltY - sheetH / 2 - 16);
  ctx.lineTo(sheet.x + 12, state.beltY - sheetH / 2 - 16);
  ctx.lineTo(sheet.x, state.beltY - sheetH / 2);
  ctx.closePath();
  ctx.fill();

  // The blocks.
  const next = sheet.layers.findIndex((l) => l.quality === null);
  const blockW = Math.min(120, state.sheetW * 0.8);
  const restY = state.beltY - sheetH / 2 - 120;
  state.stamps.forEach((x, i) => {
    const pressing = state.pressed === i && state.pressedAgo < 0.18 ? Math.sin((state.pressedAgo / 0.18) * Math.PI) : 0;
    const y = restY + pressing * 80;
    const on = i === next && state.jam <= 0;
    ctx.setLineDash([6, 8]);
    ctx.strokeStyle = on ? theme.danger : theme.stoneEdge;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + 60);
    ctx.lineTo(x, beltTop);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = theme.woodEdge;
    ctx.fillRect(x - 10, y - 70, 20, 40);
    ctx.fillStyle = theme.wood;
    roundRect(ctx, x - blockW / 2, y - 36, blockW, 70, 10);
    ctx.fill();
    ctx.lineWidth = on ? 7 : 4;
    ctx.strokeStyle = on ? theme.star : theme.woodEdge;
    ctx.stroke();
    ctx.fillStyle = layerColour(view, i);
    ctx.fillRect(x - blockW / 2 + 8, y + 22, blockW - 16, 12);
    paintLabel(ctx, view, `${i + 1}`, x, y - 2, 30);
    if (on && !view.reducedMotion) paintLabel(ctx, view, '▼', x, y - 92 + Math.sin(view.time * 8) * 6, 30, theme.star);
  });
  if (state.jam > 0) paintLabel(ctx, view, 'Khuôn kẹt rồi!', arena.width / 2, restY - 120 > HUD_SAFE_TOP + 110 ? restY - 120 : restY + 120, 32, theme.danger);
}
