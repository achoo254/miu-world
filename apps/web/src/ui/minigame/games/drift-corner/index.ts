// Drift corner (content/minigames/drift-corner.json): hold to swing the car round each corner post, let go to go straight.
import { defineMinigame } from '../../define-minigame';
import { drawDriftCorner } from './draw';
import { createDriftCorner, driftCornerBot } from './logic';

export default defineMinigame({
  sprites: ['racing-car', 'collision', 'star'],
  createGame: createDriftCorner,
  draw: drawDriftCorner,
  bot: driftCornerBot,
});
