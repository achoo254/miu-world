// Cup stacking (content/minigames/cup-stacking.json): build 3-3-3 pyramids left to right, then take them down.
import { defineMinigame } from '../../define-minigame';
import { drawCupStacking } from './draw';
import { createCupStacking, cupStackingBot } from './logic';

export default defineMinigame({
  sprites: ['stopwatch'],
  createGame: createCupStacking,
  draw: drawCupStacking,
  bot: cupStackingBot,
});
