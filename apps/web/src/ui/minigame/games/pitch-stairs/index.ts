// Pitch stairs (content/minigames/pitch-stairs.json): was the second note higher or lower? Climb the ice stairs.
import { defineMinigame } from '../../define-minigame';
import { drawPitchStairs } from './draw';
import { createPitchStairs, pitchStairsBot } from './logic';

export default defineMinigame({
  sprites: ['musical-note'],
  createGame: createPitchStairs,
  draw: drawPitchStairs,
  bot: pitchStairsBot,
});
