// Crowd gates (content/minigames/crowd-gates.json): pick the gate whose sum grows the crowd; push the car at the end.
import { defineMinigame } from '../../define-minigame';
import { drawCrowdGates, RUNNERS } from './draw';
import { createCrowdGates, crowdBot } from './logic';

export default defineMinigame({
  sprites: [...RUNNERS, 'automobile'],
  createGame: createCrowdGates,
  draw: drawCrowdGates,
  bot: crowdBot,
});
