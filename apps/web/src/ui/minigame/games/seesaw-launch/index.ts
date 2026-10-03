// Seesaw launch (content/minigames/seesaw-launch.json): drop a sandbag from the right height to fly the ball into the basket.
import { defineMinigame } from '../../define-minigame';
import { drawSeesawLaunch } from './draw';
import { createSeesawLaunch, seesawLaunchBot } from './logic';

export default defineMinigame({
  sprites: ['basket', 'basketball', 'sparkles'],
  createGame: createSeesawLaunch,
  draw: drawSeesawLaunch,
  bot: seesawLaunchBot,
});
