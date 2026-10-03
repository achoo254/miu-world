// Current drift (content/minigames/current-drift.json): drop rocks to steer the drifting letter to the island.
import { defineMinigame } from '../../define-minigame';
import { drawCurrentDrift } from './draw';
import { createCurrentDrift, driftBot } from './logic';

export default defineMinigame({
  sprites: ['desert-island', 'rock', 'envelope'],
  createGame: createCurrentDrift,
  draw: drawCurrentDrift,
  bot: driftBot,
});
