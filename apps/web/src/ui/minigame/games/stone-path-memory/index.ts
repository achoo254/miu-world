// Stone path memory (content/minigames/stone-path-memory.json): watch the stones light up, then hop across them.
import { defineMinigame } from '../../define-minigame';
import { drawStonePath } from './draw';
import { createStonePath, stonePathBot } from './logic';

export default defineMinigame({
  sprites: ['droplet'],
  createGame: createStonePath,
  draw: drawStonePath,
  bot: stonePathBot,
});
