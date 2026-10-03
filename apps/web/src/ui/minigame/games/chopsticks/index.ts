// Chopsticks (content/minigames/chopsticks.json): pick beans up with chopsticks and carry them slowly to the bowl.
import { defineMinigame } from '../../define-minigame';
import { drawChopsticks } from './draw';
import { chopsticksBot, createChopsticks } from './logic';

export default defineMinigame({
  sprites: ['beans', 'chopsticks', 'bowl-with-spoon'],
  createGame: createChopsticks,
  draw: drawChopsticks,
  bot: chopsticksBot,
});
