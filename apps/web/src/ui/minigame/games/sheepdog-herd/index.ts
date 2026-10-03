// Sheepdog herd (content/minigames/sheepdog-herd.json): drag the dog to drive the ducks into the pen.
import { defineMinigame } from '../../define-minigame';
import { drawSheepdogHerd } from './draw';
import { createSheepdogHerd, sheepdogBot } from './logic';

export default defineMinigame({
  sprites: ['duck', 'dog-face', 'tulip', 'sunflower', 'sparkles'],
  createGame: createSheepdogHerd,
  draw: drawSheepdogHerd,
  bot: sheepdogBot,
});
