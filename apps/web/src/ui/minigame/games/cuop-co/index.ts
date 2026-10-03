// Cướp cờ (content/minigames/cuop-co.json): dash for the flag when your picture is called, then dodge home with it.
import { defineMinigame } from '../../define-minigame';
import { drawCuopCo, FLAG_SPRITES } from './draw';
import { createCuopCo, cuopCoBot } from './logic';

export default defineMinigame({
  sprites: FLAG_SPRITES,
  createGame: createCuopCo,
  draw: drawCuopCo,
  bot: cuopCoBot,
});
