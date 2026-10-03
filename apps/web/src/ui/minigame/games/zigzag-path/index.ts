// Zigzag path (content/minigames/zigzag-path.json): tap to swap the ball's slant at every corner of the path.
import { defineMinigame } from '../../define-minigame';
import { drawZigzagPath } from './draw';
import { createZigzagPath, zigzagBot } from './logic';

export default defineMinigame({
  sprites: ['evergreen-tree', 'gem'],
  createGame: createZigzagPath,
  draw: drawZigzagPath,
  bot: zigzagBot,
});
