// Nonogram (content/minigames/nonogram.json): fill the squares the row and column numbers ask for; a picture appears.
import { defineMinigame } from '../../define-minigame';
import { drawNonogram } from './draw';
import { createNonogram, nonogramBot, PICTURES } from './logic';

export default defineMinigame({
  sprites: [...PICTURES.map((p) => p.sprite), 'sparkles'],
  createGame: createNonogram,
  draw: drawNonogram,
  bot: nonogramBot,
});
