// Chi chi chành chành (content/minigames/chi-chi.json): finger in the palm, lift it on the real "ập!".
import { defineMinigame } from '../../define-minigame';
import { drawChiChi } from './draw';
import { chiChiBot, createChiChi } from './logic';

export default defineMinigame({
  sprites: ['bear', 'sparkles'],
  createGame: createChiChi,
  draw: drawChiChi,
  bot: chiChiBot,
});
