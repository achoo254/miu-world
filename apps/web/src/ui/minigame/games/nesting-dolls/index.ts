// Nesting dolls (content/minigames/nesting-dolls.json): put each doll inside the one just one size bigger.
import { defineMinigame } from '../../define-minigame';
import { drawNestingDolls } from './draw';
import { createNestingDolls, nestingDollsBot } from './logic';

export default defineMinigame({
  sprites: ['sparkles'],
  createGame: createNestingDolls,
  draw: drawNestingDolls,
  bot: nestingDollsBot,
});
