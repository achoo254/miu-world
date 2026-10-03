// Pull the pin (content/minigames/pull-pin.json): pull the pins in the right order to drop the balls in the cup.
import { defineMinigame } from '../../define-minigame';
import { drawPullPin } from './draw';
import { createPullPin, pullPinBot } from './logic';

export default defineMinigame({
  sprites: ['wastebasket'],
  createGame: createPullPin,
  draw: drawPullPin,
  bot: pullPinBot,
});
