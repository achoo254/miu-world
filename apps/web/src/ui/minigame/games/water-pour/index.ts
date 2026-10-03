// Water pour (content/minigames/water-pour.json): hold to pour tea, let go when it reaches the green band.
import { defineMinigame } from '../../define-minigame';
import { drawWaterPour } from './draw';
import { createWaterPour, waterPourBot } from './logic';

export default defineMinigame({
  sprites: ['snail', 'turtle', 'rabbit'],
  createGame: createWaterPour,
  draw: drawWaterPour,
  bot: waterPourBot,
});
