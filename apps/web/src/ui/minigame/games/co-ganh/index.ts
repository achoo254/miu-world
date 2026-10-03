// Cờ gánh (content/minigames/co-ganh.json): step between two enemy pieces to carry them, surround the rest.
import { defineMinigame } from '../../define-minigame';
import { drawCoGanh } from './draw';
import { coGanhBot, createCoGanh } from './logic';

export default defineMinigame({
  sprites: ['sparkles'],
  createGame: createCoGanh,
  draw: drawCoGanh,
  bot: coGanhBot,
});
