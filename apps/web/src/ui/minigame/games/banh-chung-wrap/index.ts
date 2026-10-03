// Bánh chưng (content/minigames/banh-chung-wrap.json): layer, fold and tie square cakes, step by step.
import { defineMinigame } from '../../define-minigame';
import { drawBanhChung } from './draw';
import { banhChungBot, createBanhChung, SPRITE } from './logic';

export default defineMinigame({
  sprites: Object.values(SPRITE),
  createGame: createBanhChung,
  draw: drawBanhChung,
  bot: banhChungBot,
});
