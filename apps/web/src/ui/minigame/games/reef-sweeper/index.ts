// Reef sweeper (content/minigames/reef-sweeper.json): dig the safe squares; the numbers tell how many rocks touch.
import { defineMinigame } from '../../define-minigame';
import { drawReefSweeper } from './draw';
import { createReefSweeper, reefSweeperBot } from './logic';

export default defineMinigame({
  sprites: ['rock', 'sailboat', 'sparkles'],
  createGame: createReefSweeper,
  draw: drawReefSweeper,
  bot: reefSweeperBot,
});
