// Fireworks (content/minigames/fireworks.json): hold under a ring to send a rocket up, let go to burst it there.
import { defineMinigame } from '../../define-minigame';
import { drawFireworks } from './draw';
import { createFireworks, fireworksBot } from './logic';

export default defineMinigame({
  sprites: ['rocket', 'star', 'sparkles'],
  createGame: createFireworks,
  draw: drawFireworks,
  bot: fireworksBot,
});
