// Maze trace (content/minigames/maze-trace.json): lead the child through a hedge maze to the stars and home.
import { defineMinigame } from '../../define-minigame';
import { drawMazeTrace } from './draw';
import { createMazeTrace, mazeBot } from './logic';

export default defineMinigame({
  sprites: ['house', 'star', 'sparkles'],
  createGame: createMazeTrace,
  draw: drawMazeTrace,
  bot: mazeBot,
});
