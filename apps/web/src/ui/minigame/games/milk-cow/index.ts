// Milk the cow (content/minigames/milk-cow.json): swipe down on full teats, left then right.
import { defineMinigame } from '../../define-minigame';
import { drawMilkCow } from './draw';
import { createMilkCow, milkBot } from './logic';

export default defineMinigame({
  sprites: ['cow', 'bucket', 'glass-of-milk', 'heart'],
  createGame: createMilkCow,
  draw: drawMilkCow,
  bot: milkBot,
});
