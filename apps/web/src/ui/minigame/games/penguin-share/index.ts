// Penguin share (content/minigames/penguin-share.json): tap penguins to share the bucket of fish fairly.
import { defineMinigame } from '../../define-minigame';
import { drawPenguinShare } from './draw';
import { createPenguinShare, penguinShareBot } from './logic';

export default defineMinigame({
  sprites: ['penguin', 'fish', 'bucket', 'sparkles'],
  createGame: createPenguinShare,
  draw: drawPenguinShare,
  bot: penguinShareBot,
});
