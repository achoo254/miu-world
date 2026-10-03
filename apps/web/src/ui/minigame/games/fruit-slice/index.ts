// Fruit slice (content/minigames/fruit-slice.json): swipe through tossed fruit, never through a cactus.
import { defineMinigame } from '../../define-minigame';
import { drawFruitSlice } from './draw';
import { createFruitSlice, fruitSliceBot, FRUITS } from './logic';

export default defineMinigame({
  sprites: [...FRUITS, 'cactus'],
  createGame: createFruitSlice,
  draw: drawFruitSlice,
  bot: fruitSliceBot,
});
