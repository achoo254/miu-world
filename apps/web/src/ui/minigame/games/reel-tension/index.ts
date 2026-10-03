// Reel tension (content/minigames/reel-tension.json): hold to lift the green box and keep the darting fish inside it.
import { defineMinigame } from '../../define-minigame';
import { drawReelTension } from './draw';
import { createReelTension, reelTensionBot } from './logic';

export default defineMinigame({
  sprites: ['tropical-fish', 'fish', 'dolphin'],
  createGame: createReelTension,
  draw: drawReelTension,
  bot: reelTensionBot,
});
