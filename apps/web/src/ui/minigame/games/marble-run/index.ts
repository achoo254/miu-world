// Marble run (content/minigames/marble-run.json): tip the chutes so each marble rolls into its own cup.
import { defineMinigame } from '../../define-minigame';
import { drawMarbleRun, MARKS } from './draw';
import { createMarbleRun, marbleRunBot } from './logic';

export default defineMinigame({
  sprites: [...MARKS],
  createGame: createMarbleRun,
  draw: drawMarbleRun,
  bot: marbleRunBot,
});
