// The hundred-knot bamboo (content/minigames/bamboo-hundred.json): tap the knots in counting order.
import { defineMinigame } from '../../define-minigame';
import { drawBambooHundred } from './draw';
import { bambooBot, createBambooHundred } from './logic';

export default defineMinigame({
  sprites: ['herb', 'sparkles'],
  createGame: createBambooHundred,
  draw: drawBambooHundred,
  bot: bambooBot,
});
