// Fruit skewer (content/minigames/fruit-skewer.json): tap the fruit that comes next in the skewer's pattern.
import { defineMinigame } from '../../define-minigame';
import { drawFruitSkewer, FRUITS } from './draw';
import { createFruitSkewer, fruitSkewerBot } from './logic';

export default defineMinigame({
  sprites: [...FRUITS, 'sparkles'],
  createGame: createFruitSkewer,
  draw: drawFruitSkewer,
  bot: fruitSkewerBot,
});
