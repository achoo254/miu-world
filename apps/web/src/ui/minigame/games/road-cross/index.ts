// Road cross (content/minigames/road-cross.json): hop the frog over the road and across the river on logs.
import { defineMinigame } from '../../define-minigame';
import { drawRoadCross } from './draw';
import { createRoadCross, roadCrossBot } from './logic';

export default defineMinigame({
  sprites: ['frog', 'automobile', 'bus', 'turtle', 'lotus', 'droplet', 'collision'],
  createGame: createRoadCross,
  draw: drawRoadCross,
  bot: roadCrossBot,
});
