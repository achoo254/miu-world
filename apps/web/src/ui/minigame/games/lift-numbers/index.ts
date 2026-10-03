// Lift numbers (content/minigames/lift-numbers.json): read each friend's tens-and-ones card and take them to that floor.
import { defineMinigame } from '../../define-minigame';
import { drawLiftNumbers, RIDER_FACES } from './draw';
import { createLiftNumbers, liftNumbersBot } from './logic';

export default defineMinigame({
  sprites: [...RIDER_FACES, 'sparkles'],
  createGame: createLiftNumbers,
  draw: drawLiftNumbers,
  bot: liftNumbersBot,
});
