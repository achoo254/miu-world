// Pottery wheel (content/minigames/pottery-wheel.json): drag along the spinning clay to match the pot's outline.
import { defineMinigame } from '../../define-minigame';
import { drawPotteryWheel } from './draw';
import { createPotteryWheel, potteryBot } from './logic';

export default defineMinigame({
  sprites: ['sparkles'],
  createGame: createPotteryWheel,
  draw: drawPotteryWheel,
  bot: potteryBot,
});
