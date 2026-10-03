// Nhảy sạp (content/minigames/nhay-sap.json): hop in while the bamboo poles are open, out before they clack.
import { defineMinigame } from '../../define-minigame';
import { drawNhaySap } from './draw';
import { createNhaySap, nhaySapBot } from './logic';

export default defineMinigame({
  sprites: ['red-paper-lantern', 'rabbit', 'fox'],
  createGame: createNhaySap,
  draw: drawNhaySap,
  bot: nhaySapBot,
});
