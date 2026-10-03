// Block count (content/minigames/block-count.json): count the cubes of a 3D stack, hidden ones too.
import { defineMinigame } from '../../define-minigame';
import { drawBlockCount } from './draw';
import { blockCountBot, createBlockCount } from './logic';

export default defineMinigame({
  sprites: ['sparkles'],
  createGame: createBlockCount,
  draw: drawBlockCount,
  bot: blockCountBot,
});
