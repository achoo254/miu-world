// Shade for the cat (content/minigames/shadow-shade.json): move the sun so a shadow covers the napping cat.
import { defineMinigame } from '../../define-minigame';
import { drawShadowShade } from './draw';
import { createShadowShade, shadowShadeBot } from './logic';

export default defineMinigame({
  sprites: ['sun', 'deciduous-tree', 'house', 'cat', 'heart', 'droplet'],
  createGame: createShadowShade,
  draw: drawShadowShade,
  bot: shadowShadeBot,
});
