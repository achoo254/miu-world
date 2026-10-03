// Magnet sweep (content/minigames/magnet-sweep.json): pick up the iron things with a magnet, drop them in the toolbox.
import { defineMinigame } from '../../define-minigame';
import { drawMagnetSweep, THINGS } from './draw';
import { createMagnetSweep, magnetBot } from './logic';

export default defineMinigame({
  sprites: [...THINGS, 'magnet', 'toolbox', 'sparkles'],
  createGame: createMagnetSweep,
  draw: drawMagnetSweep,
  bot: magnetBot,
});
