// Firefly sync (content/minigames/firefly-sync.json): flash the lantern together with the swarm to win fireflies.
import { defineMinigame } from '../../define-minigame';
import { drawFireflySync } from './draw';
import { createFireflySync, fireflySyncBot } from './logic';

export default defineMinigame({
  sprites: ['full-moon', 'evergreen-tree', 'red-paper-lantern'],
  createGame: createFireflySync,
  draw: drawFireflySync,
  bot: fireflySyncBot,
});
