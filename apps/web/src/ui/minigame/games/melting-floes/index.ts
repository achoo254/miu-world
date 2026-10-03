// Melting floes (content/minigames/melting-floes.json): hop between ice floes before they sink, and pick up fish.
import { defineMinigame } from '../../define-minigame';
import { drawMeltingFloes } from './draw';
import { createMeltingFloes, meltingFloesBot } from './logic';

export default defineMinigame({
  sprites: ['penguin', 'fish', 'droplet'],
  createGame: createMeltingFloes,
  draw: drawMeltingFloes,
  bot: meltingFloesBot,
});
