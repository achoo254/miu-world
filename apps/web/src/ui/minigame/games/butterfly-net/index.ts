// Butterfly net (content/minigames/butterfly-net.json): creep up on butterflies with the net, lift to catch.
import { defineMinigame } from '../../define-minigame';
import { butterflyBot, createButterflyNet } from './logic';
import { drawButterflyNet } from './draw';

export default defineMinigame({
  sprites: ['butterfly', 'tulip', 'sunflower', 'lotus', 'collision', 'sparkles'],
  createGame: createButterflyNet,
  draw: drawButterflyNet,
  bot: butterflyBot,
});
