// Scratch reveal (content/minigames/scratch-reveal.json): rub the snow off a card and guess the animal.
import { defineMinigame } from '../../define-minigame';
import { ANIMALS, drawScratchReveal } from './draw';
import { createScratchReveal, scratchBot } from './logic';

export default defineMinigame({
  sprites: [...ANIMALS, 'sparkles', 'snowflake', 'spiral-shell'],
  createGame: createScratchReveal,
  draw: drawScratchReveal,
  bot: scratchBot,
});
