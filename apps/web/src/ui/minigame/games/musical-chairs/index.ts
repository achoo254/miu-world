// Musical chairs (content/minigames/musical-chairs.json): when the music stops, tap an empty chair before the friends.
import { defineMinigame } from '../../define-minigame';
import { drawMusicalChairs } from './draw';
import { createMusicalChairs, musicalChairsBot } from './logic';

export default defineMinigame({
  sprites: ['rabbit', 'fox', 'bear', 'panda', 'dog-face', 'frog', 'musical-note', 'balloon'],
  createGame: createMusicalChairs,
  draw: drawMusicalChairs,
  bot: musicalChairsBot,
});
