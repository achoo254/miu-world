// Bánh xèo (content/minigames/banh-xeo-flip.json): pour, flip when golden and serve, on three pans at once.
import { defineMinigame } from '../../define-minigame';
import { drawBanhXeo } from './draw';
import { banhXeoBot, createBanhXeo } from './logic';

export default defineMinigame({
  sprites: ['herb', 'egg', 'carrot', 'leaf', 'lemon'],
  createGame: createBanhXeo,
  draw: drawBanhXeo,
  bot: banhXeoBot,
});
