// Picture crossword (content/minigames/picture-crossword.json): fill a small crossword clued by pictures.
import { defineMinigame } from '../../define-minigame';
import { drawPictureCrossword } from './draw';
import { createPictureCrossword, pictureCrosswordBot } from './logic';
import { PUZZLE_SPRITES } from './puzzles';

export default defineMinigame({
  sprites: PUZZLE_SPRITES,
  createGame: createPictureCrossword,
  draw: drawPictureCrossword,
  bot: pictureCrosswordBot,
});
