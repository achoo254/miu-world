// Tug of war (content/minigames/tug-of-war.json): tap fast, and on the shout, to pull the ribbon over your line.
import { defineMinigame } from '../../define-minigame';
import { drawTugOfWar, TUG_SPRITES } from './draw';
import { createTugOfWar, tugOfWarBot } from './logic';

export default defineMinigame({
  sprites: TUG_SPRITES,
  createGame: createTugOfWar,
  draw: drawTugOfWar,
  bot: tugOfWarBot,
});
