// Wave surf (content/minigames/wave-surf.json): hold to ride heavy down the waves, let go to fly off the crests.
import { defineMinigame } from '../../define-minigame';
import { drawWaveSurf } from './draw';
import { createWaveSurf, waveSurfBot } from './logic';

export default defineMinigame({
  sprites: ['desert-island', 'sun', 'sparkles', 'crab'],
  createGame: createWaveSurf,
  draw: drawWaveSurf,
  bot: waveSurfBot,
});
