// Mirror twins (content/minigames/mirror-twins.json): every swipe moves the child and her mirrored twin; get both on their stars.
import { defineMinigame } from '../../define-minigame';
import { drawMirrorTwins } from './draw';
import { createMirrorTwins, twinsBot } from './logic';

export default defineMinigame({
  sprites: ['rock', 'star'],
  createGame: createMirrorTwins,
  draw: drawMirrorTwins,
  bot: twinsBot,
});
