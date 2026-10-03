// Magic letters (content/minigames/magic-letters.json): write a balloon's letter with one stroke to pop it.
import { defineMinigame } from '../../define-minigame';
import { drawMagicLetters, LETTER_PICTURES } from './draw';
import { createMagicLetters, magicLettersBot } from './logic';

export default defineMinigame({
  sprites: ['balloon', 'sparkles', ...Object.values(LETTER_PICTURES)],
  createGame: createMagicLetters,
  draw: drawMagicLetters,
  bot: magicLettersBot,
});
