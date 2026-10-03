// Fruit merge (content/minigames/fruit-merge.json): drop fruit into the crate; two alike make a bigger one.
import { defineMinigame } from '../../define-minigame';
import { drawFruitMerge } from './draw';
import { createFruitMerge, FRUITS, fruitMergeBot } from './logic';

export default defineMinigame({
  sprites: [...FRUITS, 'cloud'],
  createGame: createFruitMerge,
  draw: drawFruitMerge,
  bot: fruitMergeBot,
});
