// Kite flute (content/minigames/hold-notes.json): hold each note for as long as it lasts.
import { defineMinigame } from '../../define-minigame';
import { drawHoldNotes } from './draw';
import { createHoldNotes, holdNotesBot } from './logic';

export default defineMinigame({
  sprites: ['kite', 'flute', 'musical-note'],
  createGame: createHoldNotes,
  draw: drawHoldNotes,
  bot: holdNotesBot,
});
