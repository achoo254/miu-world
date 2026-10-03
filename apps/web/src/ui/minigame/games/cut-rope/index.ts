// Cut the rope (content/minigames/cut-rope.json): swipe across a rope at the right moment to feed the frog.
import { defineMinigame } from '../../define-minigame';
import { drawCutRope } from './draw';
import { createCutRope, cutRopeBot } from './logic';

export default defineMinigame({
  sprites: ['frog', 'candy', 'leaf'],
  createGame: createCutRope,
  draw: drawCutRope,
  bot: cutRopeBot,
});
