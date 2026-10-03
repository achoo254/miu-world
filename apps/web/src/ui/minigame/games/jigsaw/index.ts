// Jigsaw (content/minigames/jigsaw.json): drag the pieces of a picture onto its frame.
import { defineMinigame } from '../../define-minigame';
import { drawJigsaw, JIGSAW_SPRITES } from './draw';
import { createJigsaw, jigsawBot } from './logic';

export default defineMinigame({
  sprites: JIGSAW_SPRITES,
  createGame: createJigsaw,
  draw: drawJigsaw,
  bot: jigsawBot,
});
