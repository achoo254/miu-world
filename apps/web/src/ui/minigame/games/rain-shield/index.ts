// Rain shield (content/minigames/rain-shield.json): draw one stroke that keeps the rain off the puppy.
import { defineMinigame } from '../../define-minigame';
import { drawRainShield } from './draw';
import { createRainShield, rainShieldBot } from './logic';

export default defineMinigame({
  sprites: ['cloud', 'dog-face', 'star', 'droplet'],
  createGame: createRainShield,
  draw: drawRainShield,
  bot: rainShieldBot,
});
