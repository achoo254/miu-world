// Folk riddle (content/minigames/folk-riddle.json): read the riddle line by line, tap the picture it describes.
import { defineMinigame } from '../../define-minigame';
import { drawFolkRiddle } from './draw';
import { createFolkRiddle, folkRiddleBot } from './logic';
import { RIDDLES } from './riddles';

export default defineMinigame({
  sprites: [...RIDDLES.map((r) => r.answer), 'owl', 'sparkles'],
  createGame: createFolkRiddle,
  draw: drawFolkRiddle,
  bot: folkRiddleBot,
});
