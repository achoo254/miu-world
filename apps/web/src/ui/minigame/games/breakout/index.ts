// Breakout (content/minigames/breakout.json): keep the ball bouncing with the paddle to break the bricks.
import { defineMinigame } from '../../define-minigame';
import { drawBreakout } from './draw';
import { breakoutBot, createBreakout } from './logic';

export default defineMinigame({
  sprites: ['star', 'red-apple', 'soccer-ball'],
  createGame: createBreakout,
  draw: drawBreakout,
  bot: breakoutBot,
});
