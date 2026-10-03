// Carp waterfall (content/minigames/carp-waterfall.json): leap up the falls between the surges.
import { defineMinigame } from '../../define-minigame';
import { drawCarpWaterfall } from './draw';
import { carpBot, createCarpWaterfall } from './logic';

export default defineMinigame({
  sprites: ['fish', 'rock', 'dragon-face', 'sparkles', 'herb', 'evergreen-tree'],
  createGame: createCarpWaterfall,
  draw: drawCarpWaterfall,
  bot: carpBot,
});
