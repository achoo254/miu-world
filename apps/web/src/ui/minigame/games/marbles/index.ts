// Marbles (content/minigames/marbles.json): pull back and let go to knock marbles out of the chalk ring.
import { defineMinigame } from '../../define-minigame';
import { drawMarbles } from './draw';
import { createMarbles, marblesBot } from './logic';

export default defineMinigame({
  sprites: [],
  createGame: createMarbles,
  draw: drawMarbles,
  bot: marblesBot,
});
