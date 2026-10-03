// Rice pound (content/minigames/rice-pound.json): pound the rice on your beat, between the friend's.
import { defineMinigame } from '../../define-minigame';
import { drawRicePound } from './draw';
import { createRicePound, ricePoundBot } from './logic';

export default defineMinigame({
  sprites: ['sheaf-of-rice', 'farmer', 'collision'],
  createGame: createRicePound,
  draw: drawRicePound,
  bot: ricePoundBot,
});
