// Đập niêu (content/minigames/dap-nieu.json): look at the pot, walk blindfolded under it and strike.
import { defineMinigame } from '../../define-minigame';
import { drawDapNieu } from './draw';
import { createDapNieu, dapNieuBot } from './logic';

export default defineMinigame({
  sprites: ['gift'],
  createGame: createDapNieu,
  draw: drawDapNieu,
  bot: dapNieuBot,
});
