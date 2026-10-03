// Sled slalom (content/minigames/sled-slalom.json): steer the sled through the flag gates, round the trees.
import { defineMinigame } from '../../define-minigame';
import { drawSledSlalom } from './draw';
import { createSledSlalom, sledBot } from './logic';

export default defineMinigame({
  sprites: ['sled', 'evergreen-tree'],
  createGame: createSledSlalom,
  draw: drawSledSlalom,
  bot: sledBot,
});
