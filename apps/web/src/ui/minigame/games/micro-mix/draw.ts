// Micro mix's picture: a bright backdrop that changes colour per tiny game, the word for what to do (with its
// picture) big at the top, a timer bar running down, and the tiny game itself: an apple tree, a door blowing in
// the rain, lit bulbs on a dark wall, bees over a cake, a ball falling, twinkling stars. A won game flashes
// "Giỏi!", a lost one "Ối!".
import { paintLabel, paintSky, roundRect } from '../../draw-kit';
import type { SpriteRef } from '../../sprites';
import { HUD_SAFE_TOP, type DrawView } from '../../types';
import type { Micro, MicroMixState } from './logic';

const WORDS: Readonly<Record<Micro, [string, SpriteRef]>> = {
  apples: ['Hái táo!', 'red-apple'],
  door: ['Đóng cửa!', 'house'],
  lights: ['Tắt đèn!', 'light-bulb'],
  bees: ['Đuổi ong!', 'honeybee'],
  ball: ['Bắt bóng!', 'soccer-ball'],
  stars: ['Chạm sao!', 'star'],
};
export const MICRO_SPRITES: readonly SpriteRef[] = ['red-apple', 'deciduous-tree', 'house', 'light-bulb', 'honeybee', 'birthday-cake', 'soccer-ball', 'star', 'cloud', 'sparkles'];

function paintDoor(ctx: CanvasRenderingContext2D, view: DrawView, state: MicroMixState): void {
  const { arena, theme, sprites } = view;
  const w = Math.min(220, arena.width * 0.4);
  const h = Math.min(320, state.floorY - HUD_SAFE_TOP - 140);
  const x = arena.width / 2 - w / 2;
  const y = state.floorY - h;
  ctx.fillStyle = theme.ink;
  ctx.fillRect(x, y, w, h);
  sprites.draw(ctx, 'cloud', x + w / 2, y + 50, 90);
  ctx.fillStyle = theme.water;
  for (let i = 0; i < 8; i += 1) ctx.fillRect(x + 20 + ((i * 37) % (w - 30)), y + 90 + ((view.time * 300 + i * 40) % (h - 100)), 4, 16);
  // The door swings on its hinge: open = narrow (seen edge on), shut = full width.
  const swing = state.shut >= 1 ? 1 : 0.25 + 0.1 * Math.sin(view.time * 4);
  const hingeX = state.hinge < 0 ? x : x + w;
  ctx.fillStyle = theme.wood;
  ctx.strokeStyle = theme.ink;
  ctx.lineWidth = 5;
  const dw = w * swing;
  roundRect(ctx, state.hinge < 0 ? hingeX : hingeX - dw, y, dw, h, 8);
  ctx.fill();
  ctx.stroke();
  if (state.shut < 1) paintLabel(ctx, view, state.hinge < 0 ? '⟵' : '⟶', arena.width / 2, state.floorY + 30, 50, theme.light);
}

export function drawMicroMix(ctx: CanvasRenderingContext2D, state: MicroMixState, view: DrawView): void {
  const { arena, theme, sprites } = view;
  paintSky(ctx, view, arena.height, 10);
  const [word, icon] = WORDS[state.micro];
  if (state.micro === 'lights') {
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = theme.ink;
    ctx.fillRect(0, HUD_SAFE_TOP, arena.width, arena.height);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, state.floorY, arena.width, arena.height - state.floorY);
  // The word and its picture.
  const pop = state.phase === 'intro' && !view.reducedMotion ? 1 + 0.25 * Math.max(0, 1 - state.phaseAgo / 0.3) : 1;
  sprites.draw(ctx, icon, arena.width / 2 - 140, HUD_SAFE_TOP + 40, 56 * pop);
  paintLabel(ctx, view, word, arena.width / 2 + 20, HUD_SAFE_TOP + 42, 50 * pop, theme.star);
  if (state.phase === 'play') {
    const left = Math.max(0, 1 - state.phaseAgo / state.limit);
    ctx.fillStyle = left > 0.3 ? theme.leaf : theme.danger;
    roundRect(ctx, 40, HUD_SAFE_TOP + 78, (arena.width - 80) * left, 12, 6);
    ctx.fill();
  }
  if (state.phase !== 'intro') {
    const t = state.phaseAgo;
    switch (state.micro) {
      case 'apples':
        sprites.draw(ctx, 'deciduous-tree', arena.width / 2, (HUD_SAFE_TOP + state.floorY) / 2 + 40, Math.min(arena.width, state.floorY - HUD_SAFE_TOP) * 0.95, { alpha: 0.9 });
        for (const a of state.targets) if (!a.gone) sprites.draw(ctx, 'red-apple', a.x, a.y, 76);
        break;
      case 'lights':
        for (const b of state.targets) {
          if (!b.gone) {
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = theme.star;
            ctx.beginPath();
            ctx.arc(b.x, b.y, 60, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
          sprites.draw(ctx, 'light-bulb', b.x, b.y, 80, { alpha: b.gone ? 0.35 : 1 });
        }
        break;
      case 'bees':
        sprites.draw(ctx, 'birthday-cake', arena.width / 2, state.floorY - 70, 140);
        for (const b of state.targets) if (!b.gone) sprites.draw(ctx, 'honeybee', b.x, b.y, 72, { flipX: Math.sin(view.time * 3) > 0 });
        break;
      case 'ball': {
        const b = state.targets[0];
        if (b) sprites.draw(ctx, 'soccer-ball', b.x, b.y, 84, { rotate: view.reducedMotion ? 0 : t * 6, alpha: b.gone ? 0.4 : 1 });
        break;
      }
      case 'stars': {
        const each = (state.limit - 0.3) / 4;
        for (const s of state.targets) {
          const showing = t >= s.from && t < s.from + each + 0.15;
          if (s.gone) sprites.draw(ctx, 'sparkles', s.x, s.y, 60, { alpha: 0.6 });
          else if (showing) sprites.draw(ctx, 'star', s.x, s.y, 80 * (view.reducedMotion ? 1 : 0.9 + 0.15 * Math.sin(view.time * 14)));
        }
        break;
      }
      case 'door':
        paintDoor(ctx, view, state);
        break;
    }
  }
  if (state.phase === 'won') paintLabel(ctx, view, 'Giỏi!', arena.width / 2, arena.height / 2, 80, theme.star);
  if (state.phase === 'lost') paintLabel(ctx, view, 'Ối!', arena.width / 2, arena.height / 2, 80, theme.light);
}
