// Dot copy (content/minigames/dot-copy.json): join the dots to copy the sample picture.
import { defineMinigame } from '../../define-minigame';
import { drawDotCopy } from './draw';
import { createDotCopy, dotCopyBot } from './logic';

export default defineMinigame({
  sprites: ['glowing-star'],
  createGame: createDotCopy,
  draw: drawDotCopy,
  bot: dotCopyBot,
});
