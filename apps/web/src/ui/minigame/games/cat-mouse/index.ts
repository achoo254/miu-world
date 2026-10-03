// Cat and mouse (content/minigames/cat-mouse.json): lead the cat through the ring just as the arms come down.
import { defineMinigame } from '../../define-minigame';
import { drawCatMouse, RING_FACES } from './draw';
import { catMouseBot, createCatMouse } from './logic';

export default defineMinigame({
  sprites: [...RING_FACES, 'mouse-face', 'cat-face', 'star', 'sparkles'],
  createGame: createCatMouse,
  draw: drawCatMouse,
  bot: catMouseBot,
});
