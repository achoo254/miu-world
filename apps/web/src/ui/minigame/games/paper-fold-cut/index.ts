// Paper fold and cut (content/minigames/paper-fold-cut.json): swipe the cut whose unfolded paper matches the picture.
import { defineMinigame } from '../../define-minigame';
import { drawPaperFoldCut } from './draw';
import { createPaperFoldCut, paperFoldCutBot } from './logic';

export default defineMinigame({
  sprites: ['snowflake', 'sparkles'],
  createGame: createPaperFoldCut,
  draw: drawPaperFoldCut,
  bot: paperFoldCutBot,
});
