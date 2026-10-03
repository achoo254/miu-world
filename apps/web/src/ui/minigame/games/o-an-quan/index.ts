// Ô ăn quan (content/minigames/o-an-quan.json): sow pebbles round the board and win more stones than the monkey.
import { defineMinigame } from '../../define-minigame';
import { drawOAnQuan } from './draw';
import { createOAnQuan, oAnQuanBot } from './logic';

export default defineMinigame({
  sprites: ['rock', 'monkey-face'],
  createGame: createOAnQuan,
  draw: drawOAnQuan,
  bot: oAnQuanBot,
});
