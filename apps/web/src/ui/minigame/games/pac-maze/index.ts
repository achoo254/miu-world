// Pac maze (content/minigames/pac-maze.json): swipe through a maze eating seeds, away from the ghosts.
import { defineMinigame } from '../../define-minigame';
import { drawPacMaze } from './draw';
import { createPacMaze, pacBot } from './logic';

export default defineMinigame({
  sprites: ['ghost', 'star'],
  createGame: createPacMaze,
  draw: drawPacMaze,
  bot: pacBot,
});
