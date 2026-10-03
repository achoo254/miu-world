// Nu na nu nống (content/minigames/nu-na-nu-nong.json): count the rhyme's words along the legs; tap the leg
// the last word lands on.
import { defineMinigame } from '../../define-minigame';
import { drawNuNa } from './draw';
import { createNuNa, FRIENDS, nuNaBot } from './logic';

export default defineMinigame({
  sprites: [...FRIENDS, 'sparkles', 'glowing-star'],
  createGame: createNuNa,
  draw: drawNuNa,
  bot: nuNaBot,
});
