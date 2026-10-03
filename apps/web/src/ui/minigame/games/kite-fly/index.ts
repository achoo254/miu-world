// Kite fly (content/minigames/kite-fly.json): steer the kite into the wind stream and away from branches and birds.
import { defineMinigame } from '../../define-minigame';
import { drawKiteFly } from './draw';
import { createKiteFly, kiteBot } from './logic';

export default defineMinigame({
  sprites: ['kite', 'cloud', 'leaf', 'bird', 'star', 'deciduous-tree', 'evergreen-tree', 'cat', 'rabbit', 'fox', 'bear'],
  createGame: createKiteFly,
  draw: drawKiteFly,
  bot: kiteBot,
});
