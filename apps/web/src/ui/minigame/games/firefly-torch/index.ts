// Firefly torch (content/minigames/firefly-torch.json): sweep the torch, tap the fireflies it lights.
import { defineMinigame } from '../../define-minigame';
import { drawFireflyTorch } from './draw';
import { createFireflyTorch, fireflyBot } from './logic';

export default defineMinigame({
  sprites: ['flashlight', 'jar', 'evergreen-tree', 'deciduous-tree', 'mushroom'],
  createGame: createFireflyTorch,
  draw: drawFireflyTorch,
  bot: fireflyBot,
});
