// Light mirrors (content/minigames/light-mirrors.json): flip mirrors to lead the sunbeam to the flower.
import { defineMinigame } from '../../define-minigame';
import { drawLightMirrors } from './draw';
import { createLightMirrors, lightMirrorsBot } from './logic';

export default defineMinigame({
  sprites: ['sun', 'sunflower', 'seedling'],
  createGame: createLightMirrors,
  draw: drawLightMirrors,
  bot: lightMirrorsBot,
});
