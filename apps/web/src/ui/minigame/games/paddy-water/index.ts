// Paddy water (content/minigames/paddy-water.json): open and close the sluice gates to bring each terrace to its line.
import { defineMinigame } from '../../define-minigame';
import { drawPaddyWater } from './draw';
import { createPaddyWater, paddyWaterBot } from './logic';

export default defineMinigame({
  sprites: ['seedling', 'sheaf-of-rice', 'droplet', 'sparkles'],
  createGame: createPaddyWater,
  draw: drawPaddyWater,
  bot: paddyWaterBot,
});
