// Dots and boxes (content/minigames/dots-boxes.json): close more boxes than the owl.
import { defineMinigame } from '../../define-minigame';
import { drawDotsBoxes } from './draw';
import { createDotsBoxes, dotsBot } from './logic';

export default defineMinigame({
  sprites: ['owl'],
  createGame: createDotsBoxes,
  draw: drawDotsBoxes,
  bot: dotsBot,
});
