// Memory pairs (content/minigames/memory-pairs.json): turn cards over two at a time to find the pairs.
import { defineMinigame } from '../../define-minigame';
import { drawMemoryPairs, FACES } from './draw';
import { createMemoryPairs, memoryBot } from './logic';

export default defineMinigame({
  sprites: [...new Set(Object.values(FACES).flat()), 'paw-prints', 'sparkles'],
  createGame: createMemoryPairs,
  draw: drawMemoryPairs,
  bot: memoryBot,
});
