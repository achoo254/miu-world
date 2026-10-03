// Water jugs (content/minigames/water-jugs.json): pour between cans until one holds what the cow needs.
import { defineMinigame } from '../../define-minigame';
import { drawWaterJugs } from './draw';
import { createWaterJugs, waterJugsBot } from './logic';

export default defineMinigame({
  sprites: ['cow', 'sparkles'],
  createGame: createWaterJugs,
  draw: drawWaterJugs,
  bot: waterJugsBot,
});
