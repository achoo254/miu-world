// Stilts walk (content/minigames/stilts-walk.json): step on the side you lean to and walk far on bamboo stilts.
import { defineMinigame } from '../../define-minigame';
import { drawStiltsWalk } from './draw';
import { createStiltsWalk, stiltsBot } from './logic';

export default defineMinigame({
  sprites: ['running-shoe', 'collision'],
  createGame: createStiltsWalk,
  draw: drawStiltsWalk,
  bot: stiltsBot,
});
