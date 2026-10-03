// Traffic cop (content/minigames/traffic-cop.json): tap waiting cars to wave them across without crossing traffic bumping.
import { defineMinigame } from '../../define-minigame';
import { drawTrafficCop } from './draw';
import { createTrafficCop, trafficCopBot } from './logic';

export default defineMinigame({
  sprites: ['deciduous-tree', 'collision'],
  createGame: createTrafficCop,
  draw: drawTrafficCop,
  bot: trafficCopBot,
});
