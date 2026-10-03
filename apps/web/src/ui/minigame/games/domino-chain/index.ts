// Domino chain (content/minigames/domino-chain.json): stand dominoes along the path, push the first to ring the bell.
import { defineMinigame } from '../../define-minigame';
import { drawDominoChain } from './draw';
import { createDominoChain, dominoBot } from './logic';

export default defineMinigame({
  sprites: ['bell', 'books', 'sparkles'],
  createGame: createDominoChain,
  draw: drawDominoChain,
  bot: dominoBot,
});
