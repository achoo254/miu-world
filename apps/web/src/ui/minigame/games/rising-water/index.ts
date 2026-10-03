// Rising water (content/minigames/rising-water.json): hold a hill to raise it above the coming wave.
import { defineMinigame } from '../../define-minigame';
import { drawRisingWater } from './draw';
import { createRisingWater, risingWaterBot } from './logic';

export default defineMinigame({
  sprites: ['house', 'dragon-face'],
  createGame: createRisingWater,
  draw: drawRisingWater,
  bot: risingWaterBot,
});
