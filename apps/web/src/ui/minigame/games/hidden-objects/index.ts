// Hidden objects (content/minigames/hidden-objects.json): find the six things shown in the tray in a busy scene.
import { defineMinigame } from '../../define-minigame';
import { drawHiddenObjects } from './draw';
import { createHiddenObjects, HIDDEN_SPRITES, hiddenObjectsBot } from './logic';

export default defineMinigame({
  sprites: [...HIDDEN_SPRITES, 'sparkles'],
  createGame: createHiddenObjects,
  draw: drawHiddenObjects,
  bot: hiddenObjectsBot,
});
