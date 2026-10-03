// Bắt trạch (content/minigames/bat-trach.json): keep a finger on the slippery loach's head until it is caught.
import { defineMinigame } from '../../define-minigame';
import { batTrachBot, createBatTrach } from './logic';
import { drawBatTrach } from './draw';

export default defineMinigame({
  sprites: ['sparkles'],
  createGame: createBatTrach,
  draw: drawBatTrach,
  bot: batTrachBot,
});
