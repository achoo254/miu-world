// Customer memory (content/minigames/customer-memory.json): remember each customer's order and serve it.
import { defineMinigame } from '../../define-minigame';
import { CUSTOMER_FACES, DISH_PICTURES, drawCustomerMemory } from './draw';
import { createCustomerMemory, customerMemoryBot } from './logic';

export default defineMinigame({
  sprites: [...DISH_PICTURES, ...CUSTOMER_FACES, 'heart', 'cloud'],
  createGame: createCustomerMemory,
  draw: drawCustomerMemory,
  bot: customerMemoryBot,
});
