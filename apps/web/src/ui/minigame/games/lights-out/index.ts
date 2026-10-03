// Lights out (content/minigames/lights-out.json): tap windows (each switches its neighbours too) until all are lit.
import { defineMinigame } from '../../define-minigame';
import { drawLightsOut } from './draw';
import { createLightsOut, lightsOutBot } from './logic';

export default defineMinigame({
  sprites: ['full-moon', 'star', 'sparkles'],
  createGame: createLightsOut,
  draw: drawLightsOut,
  bot: lightsOutBot,
});
