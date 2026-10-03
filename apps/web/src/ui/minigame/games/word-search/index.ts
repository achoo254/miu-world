// Word search (content/minigames/word-search.json): find the six pictured words hidden in the letters.
import { defineMinigame } from '../../define-minigame';
import { drawWordSearch, PICTURES } from './draw';
import { createWordSearch, wordSearchBot } from './logic';

export default defineMinigame({
  sprites: PICTURES,
  createGame: createWordSearch,
  draw: drawWordSearch,
  bot: wordSearchBot,
});
