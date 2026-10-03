// Đàn bầu (content/minigames/dan-bau.json): move a held finger up and down to keep the singing dot on the ribbon.
import { defineMinigame } from '../../define-minigame';
import { drawDanBau } from './draw';
import { createDanBau, danBauBot } from './logic';

export default defineMinigame({
  sprites: ['musical-note'],
  createGame: createDanBau,
  draw: drawDanBau,
  bot: danBauBot,
});
