// Jump rope (content/minigames/jump-rope.json): tap to jump each time the turning rope comes round to the feet.
import { defineMinigame } from '../../define-minigame';
import { drawJumpRope } from './draw';
import { createJumpRope, jumpRopeBot } from './logic';

export default defineMinigame({
  sprites: ['rabbit', 'bear', 'panda', 'fox'],
  createGame: createJumpRope,
  draw: drawJumpRope,
  bot: jumpRopeBot,
});
