// Word chain (content/minigames/word-chain.json): pick the word that starts with the last word's ending.
import { defineMinigame } from '../../define-minigame';
import { drawWordChain } from './draw';
import { createWordChain, wordChainBot, WORDS } from './logic';

export default defineMinigame({
  sprites: [...new Set(WORDS.map((w) => w.picture)), 'dragon-face'],
  createGame: createWordChain,
  draw: drawWordChain,
  bot: wordChainBot,
});
