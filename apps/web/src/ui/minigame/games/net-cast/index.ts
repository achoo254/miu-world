// Net cast (content/minigames/net-cast.json): swipe to throw the cast net over a moving shoal of fish.
import { defineMinigame } from '../../define-minigame';
import { drawNetCast } from './draw';
import { createNetCast, netCastBot } from './logic';

export default defineMinigame({
  sprites: ['fish', 'tropical-fish', 'canoe'],
  createGame: createNetCast,
  draw: drawNetCast,
  bot: netCastBot,
});
