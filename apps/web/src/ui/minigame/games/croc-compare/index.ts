// Hungry crocodile (content/minigames/croc-compare.json): swipe the crocodile toward the bigger plate.
import { defineMinigame } from '../../define-minigame';
import { drawCrocCompare, ITEMS } from './draw';
import { createCrocCompare, crocBot } from './logic';

export default defineMinigame({
  sprites: ['crocodile', ...ITEMS],
  createGame: createCrocCompare,
  draw: drawCrocCompare,
  bot: crocBot,
});
