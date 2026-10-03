// Simon says (content/minigames/simon-says.json): listen to the animals' song, tap it back in order.
import { defineMinigame } from '../../define-minigame';
import { drawSimonSays } from './draw';
import { ANIMALS, createSimonSays, simonSaysBot } from './logic';

export default defineMinigame({
  sprites: [...ANIMALS, 'musical-note', 'glowing-star'],
  createGame: createSimonSays,
  draw: drawSimonSays,
  bot: simonSaysBot,
});
