// Kéo cưa lừa xẻ (content/minigames/keo-cua.json): saw in time with your friend to cut through each log.
import { defineMinigame } from '../../define-minigame';
import { drawKeoCua } from './draw';
import { createKeoCua, keoCuaBot } from './logic';

export default defineMinigame({
  sprites: ['bear', 'sparkles'],
  createGame: createKeoCua,
  draw: drawKeoCua,
  bot: keoCuaBot,
});
