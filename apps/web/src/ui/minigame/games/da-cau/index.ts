// Đá cầu (content/minigames/da-cau.json): tap the falling shuttlecock to kick it back up.
import { defineMinigame } from '../../define-minigame';
import { drawDaCau } from './draw';
import { createDaCau, daCauBot } from './logic';

export default defineMinigame({
  sprites: ['feather', 'deciduous-tree', 'collision'],
  createGame: createDaCau,
  draw: drawDaCau,
  bot: daCauBot,
});
