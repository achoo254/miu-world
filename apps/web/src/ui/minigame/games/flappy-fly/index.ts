// Flappy fly (content/minigames/flappy-fly.json): tap to flap the bird through the gaps in the bamboo.
import { defineMinigame } from '../../define-minigame';
import { drawFlappyFly } from './draw';
import { createFlappyFly, flappyBot } from './logic';

export default defineMinigame({
  sprites: ['bird', 'leaf'],
  createGame: createFlappyFly,
  draw: drawFlappyFly,
  bot: flappyBot,
});
