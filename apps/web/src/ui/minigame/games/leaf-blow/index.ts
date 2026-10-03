// Leaf blow (content/minigames/leaf-blow.json): hold a fan behind the leaves to blow them into the frame.
import { defineMinigame } from '../../define-minigame';
import { drawLeafBlow, LEAF_SPRITES } from './draw';
import { createLeafBlow, leafBlowBot } from './logic';

export default defineMinigame({
  sprites: [...LEAF_SPRITES, 'deciduous-tree', 'evergreen-tree'],
  createGame: createLeafBlow,
  draw: drawLeafBlow,
  bot: leafBlowBot,
});
