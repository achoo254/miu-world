// Tone mark (content/minigames/tone-mark.json): drag the right tone mark onto the word under its picture.
import { defineMinigame } from '../../define-minigame';
import { drawToneMark } from './draw';
import { createToneMark, toneMarkBot, WORDS } from './logic';

export default defineMinigame({
  sprites: [...new Set(Object.values(WORDS).flatMap((list) => list.map((w) => w.picture))), 'sparkles'],
  createGame: createToneMark,
  draw: drawToneMark,
  bot: toneMarkBot,
});
