// Flip stones (content/minigames/reversi.json): Reversi on a 6 × 6 board against the owl.
import { defineMinigame } from '../../define-minigame';
import { drawReversi } from './draw';
import { createReversi, reversiBot } from './logic';

export default defineMinigame({
  sprites: ['owl'],
  createGame: createReversi,
  draw: drawReversi,
  bot: reversiBot,
});
