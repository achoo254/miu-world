// Plinko (content/minigames/plinko.json): tap where to drop the coin; it bounces through the pegs into a bin.
import { defineMinigame } from '../../define-minigame';
import { drawPlinko } from './draw';
import { createPlinko, plinkoBot } from './logic';

export default defineMinigame({
  sprites: ['coin', 'gift', 'star'],
  createGame: createPlinko,
  draw: drawPlinko,
  bot: plinkoBot,
});
