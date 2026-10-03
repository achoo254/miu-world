// Runner (content/minigames/runner.json): jump and duck along a forest trail, picking up stars.
import { defineMinigame } from '../../define-minigame';
import { drawRunner } from './draw';
import { createRunner, runnerBot } from './logic';

export default defineMinigame({
  sprites: ['star', 'rock', 'wood', 'evergreen-tree', 'deciduous-tree'],
  createGame: createRunner,
  draw: drawRunner,
  bot: runnerBot,
});
