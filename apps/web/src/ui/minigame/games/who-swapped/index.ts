// Who swapped (content/minigames/who-swapped.json): look at the stall, then tap the two goods that traded places.
import { defineMinigame } from '../../define-minigame';
import { drawWhoSwapped } from './draw';
import { createWhoSwapped, GOODS, whoSwappedBot } from './logic';

export default defineMinigame({
  sprites: [...GOODS],
  createGame: createWhoSwapped,
  draw: drawWhoSwapped,
  bot: whoSwappedBot,
});
