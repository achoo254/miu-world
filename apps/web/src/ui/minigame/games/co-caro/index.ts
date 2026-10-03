// Cờ caro (content/minigames/co-caro.json): four in a row on a 6 × 6 board against Cún.
import { defineMinigame } from '../../define-minigame';
import { drawCoCaro } from './draw';
import { coCaroBot, createCoCaro } from './logic';

export default defineMinigame({
  sprites: ['dog-face'],
  createGame: createCoCaro,
  draw: drawCoCaro,
  bot: coCaroBot,
});
