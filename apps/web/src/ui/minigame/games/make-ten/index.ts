// Make ten (content/minigames/make-ten.json): tap two number tiles that add up to ten, then to a hundred.
import { defineMinigame } from '../../define-minigame';
import { drawMakeTen } from './draw';
import { createMakeTen, makeTenBot } from './logic';

export default defineMinigame({
  sprites: ['sparkles'],
  createGame: createMakeTen,
  draw: drawMakeTen,
  bot: makeTenBot,
});
