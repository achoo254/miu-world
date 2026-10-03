// Chain pop (content/minigames/chain-pop.json): one tap a level, light enough jellyfish in a chain.
import { defineMinigame } from '../../define-minigame';
import { drawChainPop } from './draw';
import { chainPopBot, createChainPop } from './logic';

export default defineMinigame({
  sprites: ['jellyfish', 'herb', 'spiral-shell'],
  createGame: createChainPop,
  draw: drawChainPop,
  bot: chainPopBot,
});
