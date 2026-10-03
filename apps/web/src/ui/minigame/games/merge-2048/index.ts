// Merge 2048 (content/minigames/merge-2048.json): swipe the board so equal numbers merge, up to 64.
import { defineMinigame } from '../../define-minigame';
import { drawMerge2048 } from './draw';
import { createMerge2048, merge2048Bot } from './logic';

export default defineMinigame({
  sprites: [],
  createGame: createMerge2048,
  draw: drawMerge2048,
  bot: merge2048Bot,
});
