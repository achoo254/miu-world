// Rotating maze (content/minigames/rotating-maze.json): turn the whole maze so the ball rolls out of the gap.
import { defineMinigame } from '../../define-minigame';
import { drawRotatingMaze } from './draw';
import { createRotatingMaze, rotatingMazeBot } from './logic';

export default defineMinigame({
  sprites: ['star', 'sparkles'],
  createGame: createRotatingMaze,
  draw: drawRotatingMaze,
  bot: rotatingMazeBot,
});
