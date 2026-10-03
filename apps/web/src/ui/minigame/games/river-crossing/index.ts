// River crossing (content/minigames/river-crossing.json): row everything across without leaving a bad pair alone.
import { defineMinigame } from '../../define-minigame';
import { drawRiverCrossing, THINGS } from './draw';
import { createRiverCrossing, riverCrossingBot } from './logic';

export default defineMinigame({
  sprites: [...new Set(THINGS.flat()), 'herb', 'sparkles'],
  createGame: createRiverCrossing,
  draw: drawRiverCrossing,
  bot: riverCrossingBot,
});
