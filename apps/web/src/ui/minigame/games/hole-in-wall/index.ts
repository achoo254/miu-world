// Hole in the wall (content/minigames/hole-in-wall.json): take the pose of the hole before the foam wall arrives.
import { defineMinigame } from '../../define-minigame';
import { drawHoleInWall } from './draw';
import { createHoleInWall, holeInWallBot } from './logic';

export default defineMinigame({
  sprites: [],
  createGame: createHoleInWall,
  draw: drawHoleInWall,
  bot: holeInWallBot,
});
