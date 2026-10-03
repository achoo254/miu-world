// Gem code's picture: a castle room, the treasure chest with its padlock (bursting open with gems, or showing
// its code when the guesses run out), the board of guesses so far with the chest's answers (a star for each gem
// in the right place, a ring for each right gem in the wrong place), the three places of the guess being made,
// and the tray of four gems. Each gem colour also has its own mark, so colour is never the only clue.
import { paintLabel, roundRect } from '../../draw-kit';
import type { DrawView, Point } from '../../types';
import { MAX_GUESSES, SLOTS, type CodeState, type Feedback } from './logic';

function gemColour(view: DrawView, gem: number): string {
  const { theme } = view;
  return [theme.danger, theme.water, theme.leaf, theme.star][gem] ?? theme.primary;
}

/** A round gem with a shine and its own mark (dot, triangle, square, diamond). */
export function paintGem(ctx: CanvasRenderingContext2D, view: DrawView, gem: number, at: Point, r: number): void {
  const { theme } = view;
  ctx.fillStyle = gemColour(view, gem);
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = Math.max(2, r * 0.1);
  ctx.beginPath();
  ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme.light;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.ellipse(at.x - r * 0.35, at.y - r * 0.4, r * 0.3, r * 0.18, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.9;
  const m = r * 0.38;
  ctx.beginPath();
  if (gem === 0) ctx.arc(at.x, at.y + r * 0.1, m * 0.7, 0, Math.PI * 2);
  else if (gem === 1) {
    ctx.moveTo(at.x, at.y - m + r * 0.1);
    ctx.lineTo(at.x + m, at.y + m + r * 0.1);
    ctx.lineTo(at.x - m, at.y + m + r * 0.1);
  } else if (gem === 2) ctx.rect(at.x - m * 0.8, at.y - m * 0.8 + r * 0.1, m * 1.6, m * 1.6);
  else {
    ctx.moveTo(at.x, at.y - m + r * 0.1);
    ctx.lineTo(at.x + m, at.y + r * 0.1);
    ctx.lineTo(at.x, at.y + m + r * 0.1);
    ctx.lineTo(at.x - m, at.y + r * 0.1);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

function paintPegs(ctx: CanvasRenderingContext2D, view: DrawView, feedback: Feedback, x: number, y: number, size: number): void {
  const { theme, sprites } = view;
  let k = 0;
  for (let i = 0; i < feedback.exact; i += 1, k += 1) sprites.draw(ctx, 'star', x + k * size * 1.1, y, size * 1.1);
  for (let i = 0; i < feedback.near; i += 1, k += 1) {
    ctx.strokeStyle = theme.light;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x + k * size * 1.1, y, size * 0.36, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (k === 0) {
    ctx.fillStyle = theme.stone;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawMastermind(ctx: CanvasRenderingContext2D, state: CodeState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  ctx.fillStyle = theme.stone;
  ctx.fillRect(0, 0, arena.width, arena.height);
  ctx.strokeStyle = theme.stoneEdge;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 3;
  for (let y = 0; y < arena.height; y += 54) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(arena.width, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Chest.
  const { chest } = state;
  const open = state.phase === 'open' ? Math.min(1, state.phaseAgo / 0.3) : 0;
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.woodEdge;
  ctx.lineWidth = 6;
  roundRect(ctx, chest.x - 80, chest.y - 10, 160, 60, 10);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.translate(chest.x, chest.y - 10);
  ctx.rotate(-open * 0.6);
  roundRect(ctx, -80, -44, 160, 44, 18);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = theme.star;
  ctx.fillRect(chest.x - 80, chest.y + 14, 160, 8);
  if (state.phase === 'open') {
    for (let k = 0; k < 5; k += 1) {
      const t = state.phaseAgo;
      sprites.draw(ctx, k % 2 === 0 ? 'gem' : 'coin', chest.x + (k - 2) * 40 * t * 2, chest.y - 40 - t * 120 + t * t * 90, 46, { alpha: Math.max(0, 1 - t / 1.6) });
    }
  } else sprites.draw(ctx, 'locked', chest.x, chest.y + 18, 48);
  if (state.phase === 'reveal') {
    for (let i = 0; i < SLOTS; i += 1) paintGem(ctx, view, state.code[i] ?? 0, { x: chest.x + (i - 1) * 46, y: chest.y - 52 }, 20);
  }

  // Board of guesses.
  const { list } = state;
  ctx.fillStyle = theme.ink;
  ctx.globalAlpha = 0.45;
  roundRect(ctx, list.x, list.y - 8, list.width, list.row * MAX_GUESSES + 16, 16);
  ctx.fill();
  ctx.globalAlpha = 1;
  const r = Math.min(18, list.row * 0.36);
  for (let row = 0; row < MAX_GUESSES; row += 1) {
    const y = list.y + (row + 0.5) * list.row;
    const guess = state.history[row];
    for (let i = 0; i < SLOTS; i += 1) {
      const at = { x: list.x + 30 + i * (r * 2 + 8), y };
      if (guess) paintGem(ctx, view, guess.gems[i] ?? 0, at, r);
      else {
        ctx.fillStyle = theme.stoneEdge;
        ctx.beginPath();
        ctx.arc(at.x, at.y, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (guess) paintPegs(ctx, view, guess.feedback, list.x + 30 + SLOTS * (r * 2 + 8) + 14, y, r * 1.3);
  }

  // The guess being made.
  state.slots.forEach((p, i) => {
    ctx.fillStyle = theme.light;
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = theme.ink;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, state.slotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
    const gem = state.guess[i];
    if (gem !== undefined) paintGem(ctx, view, gem, p, state.slotRadius * 0.85);
  });
  if (state.phase === 'guess' && state.history.length === 0 && state.guess.length === 0) {
    paintLabel(ctx, view, `${MAX_GUESSES} lần đoán`, state.slots[1]?.x ?? arena.width / 2, (state.slots[1]?.y ?? 0) - state.slotRadius - 28, 26);
  }
  // Tray.
  state.palette.forEach((p, gem) => {
    const used = state.guess.includes(gem);
    ctx.globalAlpha = used ? 0.35 : 1;
    paintGem(ctx, view, gem, p, state.paletteRadius);
    ctx.globalAlpha = 1;
  });
}
