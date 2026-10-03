// Thổi cơm thi (content/minigames/thoi-com-thi.json): keep the fire just right so the rice cooks without scorching.
import { defineMinigame } from '../../define-minigame';
import { drawThoiComThi } from './draw';
import { createThoiComThi, thoiComBot } from './logic';

export default defineMinigame({
  sprites: ['fire', 'wood', 'rock', 'cloud', 'cooked-rice', 'sparkles'],
  createGame: createThoiComThi,
  draw: drawThoiComThi,
  bot: thoiComBot,
});
