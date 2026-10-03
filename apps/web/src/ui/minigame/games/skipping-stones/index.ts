// Skipping stones (content/minigames/skipping-stones.json): swipe fast and level to make the stone skip.
import { defineMinigame } from '../../define-minigame';
import { drawSkippingStones } from './draw';
import { createSkippingStones, skippingStonesBot } from './logic';

export default defineMinigame({
  sprites: ['star', 'rock'],
  createGame: createSkippingStones,
  draw: drawSkippingStones,
  bot: skippingStonesBot,
});
