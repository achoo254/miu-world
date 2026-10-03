// Block fit (content/minigames/block-fit.json): drag parcels onto the truck's bed; full lines are driven away.
import { defineMinigame } from '../../define-minigame';
import { drawBlockFit } from './draw';
import { blockFitBot, createBlockFit } from './logic';

export default defineMinigame({
  sprites: ['package'],
  createGame: createBlockFit,
  draw: drawBlockFit,
  bot: blockFitBot,
});
