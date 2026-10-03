// Egg catch (content/minigames/egg-catch.json): drag the basket under falling eggs, away from rocks.
import { defineMinigame } from '../../define-minigame';
import { drawEggCatch } from './draw';
import { createEggCatch, eggCatchBot } from './logic';

export default defineMinigame({
  sprites: ['egg', 'rock', 'basket', 'chicken', 'monkey-face', 'sparkles'],
  createGame: createEggCatch,
  draw: drawEggCatch,
  bot: eggCatchBot,
});
