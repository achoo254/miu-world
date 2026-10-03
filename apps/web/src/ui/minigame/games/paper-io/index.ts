// Paper-io (content/minigames/paper-io.json): plough loops back to your land to claim the field inside them.
import { defineMinigame } from '../../define-minigame';
import { drawPaperIo } from './draw';
import { createPaperIo, paperIoBot } from './logic';

export default defineMinigame({
  sprites: ['tractor', 'water-buffalo', 'house'],
  createGame: createPaperIo,
  draw: drawPaperIo,
  bot: paperIoBot,
});
