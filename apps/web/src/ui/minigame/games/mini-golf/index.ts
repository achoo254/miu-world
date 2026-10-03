// Mini golf (content/minigames/mini-golf.json): pull back and let go to putt the ball into the hole.
import { defineMinigame } from '../../define-minigame';
import { drawMiniGolf } from './draw';
import { createMiniGolf, golfBot } from './logic';

export default defineMinigame({
  sprites: ['flag-in-hole', 'sparkles'],
  createGame: createMiniGolf,
  draw: drawMiniGolf,
  bot: golfBot,
});
