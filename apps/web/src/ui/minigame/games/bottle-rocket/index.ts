// Bottle rocket (content/minigames/bottle-rocket.json): pump to the green, launch at the right tilt, land on the pad.
import { defineMinigame } from '../../define-minigame';
import { drawBottleRocket } from './draw';
import { createBottleRocket, rocketBot } from './logic';

export default defineMinigame({
  sprites: ['rocket', 'parachute', 'droplet'],
  createGame: createBottleRocket,
  draw: drawBottleRocket,
  bot: rocketBot,
});
