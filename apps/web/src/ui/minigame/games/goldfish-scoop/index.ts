// Goldfish scooping (content/minigames/goldfish-scoop.json): dip the paper scoop, lift fish into the bowl.
import { defineMinigame } from '../../define-minigame';
import { drawGoldfishScoop } from './draw';
import { createGoldfishScoop, FISH, goldfishScoopBot } from './logic';

export default defineMinigame({
  sprites: [...FISH],
  createGame: createGoldfishScoop,
  draw: drawGoldfishScoop,
  bot: goldfishScoopBot,
});
