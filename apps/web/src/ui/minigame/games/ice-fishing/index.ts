// Ice fishing (content/minigames/ice-fishing.json): drop the line in the hole a fish shadow is heading for.
import { defineMinigame } from '../../define-minigame';
import { drawIceFishing } from './draw';
import { createIceFishing, iceFishingBot } from './logic';

export default defineMinigame({
  sprites: ['penguin', 'fish', 'bucket'],
  createGame: createIceFishing,
  draw: drawIceFishing,
  bot: iceFishingBot,
});
