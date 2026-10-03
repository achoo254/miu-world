// Cake decorate (content/minigames/cake-decorate.json): put exactly the ordered toppings on each cake.
import { defineMinigame } from '../../define-minigame';
import { CUSTOMERS, drawCakeDecorate, TOPPINGS } from './draw';
import { cakeBot, createCakeDecorate } from './logic';

export default defineMinigame({
  sprites: [...TOPPINGS, ...CUSTOMERS, 'heart', 'sparkles'],
  createGame: createCakeDecorate,
  draw: drawCakeDecorate,
  bot: cakeBot,
});
