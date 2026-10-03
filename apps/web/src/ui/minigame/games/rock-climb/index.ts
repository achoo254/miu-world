// Rock climb (content/minigames/rock-climb.json): tap glowing holds within reach to climb, away from cracks and rocks.
import { defineMinigame } from '../../define-minigame';
import { drawRockClimb } from './draw';
import { createRockClimb, rockClimbBot } from './logic';

export default defineMinigame({
  sprites: ['rock'],
  createGame: createRockClimb,
  draw: drawRockClimb,
  bot: rockClimbBot,
});
