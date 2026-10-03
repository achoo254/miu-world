// Cube hop (content/minigames/cube-hop.json): hop over the pyramid to colour every cube, dodging the bouncing balls.
import { defineMinigame } from '../../define-minigame';
import { drawCubeHop } from './draw';
import { createCubeHop, cubeBot } from './logic';

export default defineMinigame({
  sprites: ['sparkles'],
  createGame: createCubeHop,
  draw: drawCubeHop,
  bot: cubeBot,
});
