// Archery in the wind (content/minigames/archery-wind.json): draw, aim upwind, let go.
import { defineMinigame } from '../../define-minigame';
import { drawArchery } from './draw';
import { archeryBot, createArchery } from './logic';

export default defineMinigame({
  sprites: ['bow-and-arrow', 'leaf', 'fallen-leaf'],
  createGame: createArchery,
  draw: drawArchery,
  bot: archeryBot,
});
