// Bịt mắt bắt dê (content/minigames/blind-goat.json): walk blindfolded toward the goat's bleats and catch it.
import { defineMinigame } from '../../define-minigame';
import { drawBlindGoat } from './draw';
import { blindGoatBot, createBlindGoat } from './logic';

export default defineMinigame({
  sprites: ['goat', 'deciduous-tree'],
  createGame: createBlindGoat,
  draw: drawBlindGoat,
  bot: blindGoatBot,
});
