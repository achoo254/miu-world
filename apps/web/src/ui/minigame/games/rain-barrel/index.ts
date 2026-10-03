// Rain barrel (content/minigames/rain-barrel.json): tilt the banana leaf so the rain drips into the waiting jar.
import { defineMinigame } from '../../define-minigame';
import { drawRainBarrel } from './draw';
import { createRainBarrel, rainBarrelBot } from './logic';

export default defineMinigame({
  sprites: ['cloud', 'droplet', 'sparkles'],
  createGame: createRainBarrel,
  draw: drawRainBarrel,
  bot: rainBarrelBot,
});
