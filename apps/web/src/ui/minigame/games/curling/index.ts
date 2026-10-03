// Curling (content/minigames/curling.json): slide stones into the house, sweeping the ice to carry them.
import { defineMinigame } from '../../define-minigame';
import { drawCurling } from './draw';
import { createCurling, curlingBot } from './logic';

export default defineMinigame({
  sprites: ['curling-stone'],
  createGame: createCurling,
  draw: drawCurling,
  bot: curlingBot,
});
