// Đánh khăng (content/minigames/danh-khang.json): flick the short stick up, then hit it at the top of its flight.
import { defineMinigame } from '../../define-minigame';
import { drawDanhKhang } from './draw';
import { createDanhKhang, danhKhangBot } from './logic';

export default defineMinigame({
  sprites: [],
  createGame: createDanhKhang,
  draw: drawDanhKhang,
  bot: danhKhangBot,
});
