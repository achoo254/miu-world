// Rice winnow's picture: a village yard with wind streaks blowing right, the round woven tray full of white
// rice and golden husks, a toss flying up (husks drift off with the wind, rice falls back; a too-high toss
// blows rice away too), chickens on the right pecking at what lands, a height gauge with its good band, and
// the stars of finished trays.
import { paintGround, paintHills, paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { DrawView } from '../../types';
import { HUD_SAFE_TOP } from '../../types';
import { HUSKS, RICE, TOSS_SECONDS, type WinnowState } from './logic';

/** A fixed scatter for grain k (the same every frame). */
const scatter = (k: number, salt: number): number => {
  const v = Math.sin(k * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v);
};

export function drawRiceWinnow(ctx: CanvasRenderingContext2D, state: WinnowState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  const { tray } = state;
  const groundY = tray.y - tray.r * 0.7;
  paintSky(ctx, view, groundY, 20);
  paintHills(ctx, view, groundY, view.time * 10, 70, theme.leaf);
  paintGround(ctx, view, groundY);

  // Wind streaks.
  ctx.strokeStyle = theme.light;
  ctx.lineWidth = 4;
  ctx.globalAlpha = 0.6;
  for (let i = 0; i < 6; i += 1) {
    const x = ((view.time * 260 + i * 197) % (arena.width + 200)) - 100;
    const y = HUD_SAFE_TOP + 40 + ((i * 89) % Math.max(1, groundY - HUD_SAFE_TOP - 60));
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 40, y - 10, x + 90, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  sprites.draw(ctx, 'leaf', ((view.time * 220) % (arena.width + 100)) - 50, HUD_SAFE_TOP + 60 + Math.sin(view.time * 3) * 20, 40, { rotate: view.time * 3 });

  // Chickens on the right where the husks land.
  sprites.draw(ctx, 'chicken', arena.width - 80, groundY + 40, 80, { flipX: false });
  sprites.draw(ctx, 'baby-chick', arena.width - 150, groundY + 70, 50);

  // The tray.
  ctx.fillStyle = theme.woodEdge;
  ctx.beginPath();
  ctx.ellipse(tray.x, tray.y + 10, tray.r, tray.r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = theme.wood;
  ctx.beginPath();
  ctx.ellipse(tray.x, tray.y, tray.r, tray.r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.5;
  for (let k = 1; k < 5; k += 1) {
    ctx.beginPath();
    ctx.ellipse(tray.x, tray.y, (tray.r * k) / 5, (tray.r * 0.42 * k) / 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const toss = state.toss;
  const t = toss ? toss.ago / TOSS_SECONDS : 0;
  const lift = toss ? Math.sin(t * Math.PI) * toss.height : 0;
  // Grains and husks in the tray (or in the air).
  const spread = (k: number, salt: number): { x: number; y: number } => {
    const a = scatter(k, salt) * Math.PI * 2;
    const d = Math.sqrt(scatter(k, salt + 1)) * tray.r * 0.75;
    return { x: tray.x + Math.cos(a) * d, y: tray.y + Math.sin(a) * d * 0.42 };
  };
  for (let k = 0; k < state.rice; k += 1) {
    const p = spread(k, 1);
    const flying = toss && toss.riceOff > 0 && k >= state.rice - toss.riceOff;
    const x = p.x + (flying ? t * 300 : 0);
    const y = p.y - lift * (0.8 + scatter(k, 3) * 0.3);
    ctx.fillStyle = theme.light;
    ctx.beginPath();
    ctx.ellipse(x, y, 5, 3, scatter(k, 4) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let k = 0; k < state.husks; k += 1) {
    const p = spread(k, 7);
    const blown = toss && k >= state.husks - toss.husksOff;
    const x = p.x + (blown ? t * (260 + scatter(k, 8) * 260) : 0);
    const y = p.y - lift * (blown ? 1.2 : 0.9) + (blown ? t * t * 60 : 0);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(scatter(k, 9) * 3 + (blown ? t * 8 : 0));
    ctx.fillStyle = theme.star;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = theme.woodEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // The gauge.
  const gx = Math.max(40, tray.x - tray.r - 70);
  const gTop = Math.max(HUD_SAFE_TOP + 20, tray.y - 330);
  const gBottom = tray.y;
  const toY = (h: number): number => gBottom - (h / state.maxHeight) * (gBottom - gTop);
  ctx.fillStyle = theme.light;
  roundRect(ctx, gx - 18, gTop, 36, gBottom - gTop, 18);
  ctx.fill();
  ctx.fillStyle = theme.leaf;
  roundRect(ctx, gx - 18, toY(state.goodHigh), 36, toY(state.goodLow) - toY(state.goodHigh), 8);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = theme.ink;
  roundRect(ctx, gx - 18, gTop, 36, gBottom - gTop, 18);
  ctx.stroke();
  paintLabel(ctx, view, 'vừa', gx, (toY(state.goodHigh) + toY(state.goodLow)) / 2, 20);
  if (state.lastHeight !== null) {
    const y = toY(state.lastHeight);
    ctx.fillStyle = theme.danger;
    ctx.beginPath();
    ctx.moveTo(gx + 22, y);
    ctx.lineTo(gx + 44, y - 12);
    ctx.lineTo(gx + 44, y + 12);
    ctx.closePath();
    ctx.fill();
  }

  // Husks left, and stars of finished trays.
  paintLabel(ctx, view, `Trấu: ${state.husks}/${HUSKS}`, tray.x, tray.y + tray.r * 0.42 + 30, 26);
  state.trays.slice(-6).forEach((stars, i) => {
    for (let s = 0; s < 3; s += 1) sprites.draw(ctx, 'star', 40 + s * 22, HUD_SAFE_TOP + 20 + i * 34, 24, { alpha: s < stars ? 1 : 0.25 });
  });
  if (state.cleanAgo >= 0) {
    sprites.draw(ctx, 'sparkles', tray.x, tray.y - 60, 120, { alpha: 1 - state.cleanAgo / 1.1 });
    paintLabel(ctx, view, state.rice >= RICE - 4 ? 'Gạo sạch, đủ cả!' : 'Gạo sạch rồi!', tray.x, tray.y - tray.r * 0.9, 40, theme.star);
  } else if (toss && toss.ago < 0.5) {
    const words = { low: 'Thấp quá', good: 'Vừa đẹp!', high: 'Cao quá, gạo bay!' } as const;
    paintLabel(ctx, view, words[toss.kind], tray.x, tray.y - tray.r * 0.9 - 40, 34, toss.kind === 'good' ? theme.star : theme.light);
  } else if (state.husks === HUSKS && !toss) {
    paintLabel(ctx, view, 'Vuốt lên để sảy', tray.x, tray.y - tray.r * 0.9, 32);
  }
}
