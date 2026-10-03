// Garden cycle (content/minigames/garden-cycle.json): sow, water, shoo the birds, harvest.
import { defineMinigame } from '../../define-minigame';
import { drawGardenCycle } from './draw';
import { CROPS, createGardenCycle, gardenBot } from './logic';

export default defineMinigame({
  sprites: ['seedling', 'herb', 'droplet', 'bird', ...CROPS],
  createGame: createGardenCycle,
  draw: drawGardenCycle,
  bot: gardenBot,
});
