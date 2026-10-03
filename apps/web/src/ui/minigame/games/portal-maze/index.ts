// Portal maze (content/minigames/portal-maze.json): find which magic doors lead on to the treasure chest.
import { defineMinigame } from '../../define-minigame';
import { drawPortalMaze } from './draw';
import { createPortalMaze, portalMazeBot } from './logic';

export default defineMinigame({
  sprites: ['gift', 'sparkles'],
  createGame: createPortalMaze,
  draw: drawPortalMaze,
  bot: portalMazeBot,
});
