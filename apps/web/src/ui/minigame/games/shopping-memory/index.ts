// Shopping memory (content/minigames/shopping-memory.json): remember Mum's list, pick those things at the market.
import { defineMinigame } from '../../define-minigame';
import { drawShoppingMemory, GOODS } from './draw';
import { createShoppingMemory, shoppingBot } from './logic';

export default defineMinigame({
  sprites: [...GOODS, 'basket', 'sparkles'],
  createGame: createShoppingMemory,
  draw: drawShoppingMemory,
  bot: shoppingBot,
});
