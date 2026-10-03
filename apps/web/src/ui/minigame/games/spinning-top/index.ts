// Spinning top (content/minigames/spinning-top.json): flick the top into the ring, whip it when it wobbles.
import { defineMinigame } from '../../define-minigame';
import { drawSpinningTop } from './draw';
import { createSpinningTop, spinningTopBot } from './logic';

export default defineMinigame({
  sprites: ['high-voltage'],
  createGame: createSpinningTop,
  draw: drawSpinningTop,
  bot: spinningTopBot,
});
