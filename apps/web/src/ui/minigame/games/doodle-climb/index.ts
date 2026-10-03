// Doodle climb (content/minigames/doodle-climb.json): steer a bouncing frog up leaves and clouds.
import { defineMinigame } from '../../define-minigame';
import { drawDoodleClimb } from './draw';
import { createDoodleClimb, doodleBot } from './logic';

export default defineMinigame({
  sprites: ['frog', 'cloud', 'mushroom'],
  createGame: createDoodleClimb,
  draw: drawDoodleClimb,
  bot: doodleBot,
});
