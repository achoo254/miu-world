// Red light (content/minigames/red-light.json): walk to the line while the teddy's back is turned.
import { defineMinigame } from '../../define-minigame';
import { drawRedLight } from './draw';
import { createRedLight, redLightBot } from './logic';

export default defineMinigame({
  sprites: ['teddy-bear', 'rabbit', 'panda', 'monkey-face', 'party-popper'],
  createGame: createRedLight,
  draw: drawRedLight,
  bot: redLightBot,
});
