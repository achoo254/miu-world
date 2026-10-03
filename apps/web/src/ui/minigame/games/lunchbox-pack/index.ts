// Lunchbox pack (content/minigames/lunchbox-pack.json): pack one food of each group into every lunchbox.
import { defineMinigame } from '../../define-minigame';
import { drawLunchboxPack, FOODS } from './draw';
import { createLunchboxPack, lunchboxBot } from './logic';

export default defineMinigame({
  sprites: [...FOODS, 'heart'],
  createGame: createLunchboxPack,
  draw: drawLunchboxPack,
  bot: lunchboxBot,
});
