// Pay exact (content/minigames/pay-exact.json): hand over notes that add up to exactly the price.
import { defineMinigame } from '../../define-minigame';
import { drawPayExact, GOODS } from './draw';
import { createPayExact, payExactBot } from './logic';

export default defineMinigame({
  sprites: [...GOODS, 'farmer', 'sparkles'],
  createGame: createPayExact,
  draw: drawPayExact,
  bot: payExactBot,
});
