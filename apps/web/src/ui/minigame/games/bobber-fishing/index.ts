// Bobber fishing (content/minigames/bobber-fishing.json): cast near a fish, wait for the real bite, tap.
import { defineMinigame } from '../../define-minigame';
import { drawBobberFishing } from './draw';
import { bobberBot, createBobberFishing } from './logic';

export default defineMinigame({
  sprites: ['fish', 'tropical-fish', 'lotus'],
  createGame: createBobberFishing,
  draw: drawBobberFishing,
  bot: bobberBot,
});
