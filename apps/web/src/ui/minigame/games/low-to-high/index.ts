// Low to high (content/minigames/low-to-high.json): remember the numbers, tap them from smallest to largest.
import { defineMinigame } from '../../define-minigame';
import { drawLowToHigh } from './draw';
import { createLowToHigh, lowToHighBot } from './logic';

export default defineMinigame({
  sprites: ['star', 'sparkles'],
  createGame: createLowToHigh,
  draw: drawLowToHigh,
  bot: lowToHighBot,
});
