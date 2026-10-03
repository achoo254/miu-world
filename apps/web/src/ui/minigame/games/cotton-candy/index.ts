// Cotton candy (content/minigames/cotton-candy.json): circle the stick to wind the candy, not too fast.
import { defineMinigame } from '../../define-minigame';
import { drawCottonCandy } from './draw';
import { cottonCandyBot, createCottonCandy } from './logic';

export default defineMinigame({
  sprites: ['paw-prints', 'sparkles'],
  createGame: createCottonCandy,
  draw: drawCottonCandy,
  bot: cottonCandyBot,
});
