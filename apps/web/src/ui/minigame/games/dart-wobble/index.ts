// Dart wobble (content/minigames/dart-wobble.json): tap when the wobbling aim is on the bullseye.
import { defineMinigame } from '../../define-minigame';
import { drawDartWobble } from './draw';
import { createDartWobble, dartBot } from './logic';

export default defineMinigame({
  sprites: [],
  createGame: createDartWobble,
  draw: drawDartWobble,
  bot: dartBot,
});
