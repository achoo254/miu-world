// Rope swing (content/minigames/rope-swing.json): hold to hook a vine and swing, let go to fly to the next stump.
import { defineMinigame } from '../../define-minigame';
import { drawRopeSwing } from './draw';
import { createRopeSwing, ropeSwingBot } from './logic';

export default defineMinigame({
  sprites: ['monkey', 'banana', 'palm-tree'],
  createGame: createRopeSwing,
  draw: drawRopeSwing,
  bot: ropeSwingBot,
});
