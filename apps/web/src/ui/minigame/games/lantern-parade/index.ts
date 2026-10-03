// Lantern parade (content/minigames/lantern-parade.json): hold to walk, keep the candle lit, pick up mooncakes.
import { defineMinigame } from '../../define-minigame';
import { drawLanternParade } from './draw';
import { createLanternParade, lanternParadeBot } from './logic';

export default defineMinigame({
  sprites: ['full-moon', 'red-paper-lantern', 'moon-cake', 'rabbit', 'panda', 'monkey-face'],
  createGame: createLanternParade,
  draw: drawLanternParade,
  bot: lanternParadeBot,
});
