// Hoa đăng (content/minigames/hoa-dang.json): set lanterns on the river so they drift through the gaps.
import { defineMinigame } from '../../define-minigame';
import { drawHoaDang } from './draw';
import { createHoaDang, hoaDangBot } from './logic';

export default defineMinigame({
  sprites: ['lotus', 'candle', 'canoe', 'herb', 'leafy-green', 'full-moon'],
  createGame: createHoaDang,
  draw: drawHoaDang,
  bot: hoaDangBot,
});
