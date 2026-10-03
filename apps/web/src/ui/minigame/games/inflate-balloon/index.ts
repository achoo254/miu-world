// Inflate balloon (content/minigames/inflate-balloon.json): hold to pump, let go when the balloon fills the ring.
import { defineMinigame } from '../../define-minigame';
import { drawInflateBalloon } from './draw';
import { createInflateBalloon, CUSTOMERS, inflateBalloonBot } from './logic';

export default defineMinigame({
  sprites: [...CUSTOMERS, 'collision'],
  createGame: createInflateBalloon,
  draw: drawInflateBalloon,
  bot: inflateBalloonBot,
});
