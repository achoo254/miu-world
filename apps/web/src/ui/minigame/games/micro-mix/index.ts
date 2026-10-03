// Micro mix (content/minigames/micro-mix.json): a quick string of tiny tap-and-swipe games.
import { defineMinigame } from '../../define-minigame';
import { drawMicroMix, MICRO_SPRITES } from './draw';
import { createMicroMix, microMixBot } from './logic';

export default defineMinigame({
  sprites: MICRO_SPRITES,
  createGame: createMicroMix,
  draw: drawMicroMix,
  bot: microMixBot,
});
