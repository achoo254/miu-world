// Tangram (content/minigames/tangram.json): drag and turn the seven pieces to fill a picture's shadow.
import { defineMinigame } from '../../define-minigame';
import { drawTangram } from './draw';
import { createTangram, FIGURES, tangramBot } from './logic';

export default defineMinigame({
  sprites: [...FIGURES.map((f) => f.picture), 'sparkles'],
  createGame: createTangram,
  draw: drawTangram,
  bot: tangramBot,
});
