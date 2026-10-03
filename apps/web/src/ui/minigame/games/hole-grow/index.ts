// Hole grow (content/minigames/hole-grow.json): drag the hole to swallow the yard's mess and grow.
import { defineMinigame } from '../../define-minigame';
import { drawHoleGrow, LOOKS } from './draw';
import { createHoleGrow, holeBot } from './logic';

export default defineMinigame({
  sprites: LOOKS.flat(),
  createGame: createHoleGrow,
  draw: drawHoleGrow,
  bot: holeBot,
});
