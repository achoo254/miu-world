// Ball sort (content/minigames/ball-sort-tubes.json): tap tube to tube until each holds one colour.
import { defineMinigame } from '../../define-minigame';
import { drawBallSort } from './draw';
import { ballSortBot, createBallSort } from './logic';

export default defineMinigame({
  sprites: ['sparkles'],
  createGame: createBallSort,
  draw: drawBallSort,
  bot: ballSortBot,
});
