// Bird choir (content/minigames/bird-choir.json): spot the bird singing late or off key, and tap it.
import { defineMinigame } from '../../define-minigame';
import { drawBirdChoir } from './draw';
import { birdChoirBot, createBirdChoir } from './logic';

export default defineMinigame({
  sprites: ['bird', 'musical-note', 'sparkles'],
  createGame: createBirdChoir,
  draw: drawBirdChoir,
  bot: birdChoirBot,
});
