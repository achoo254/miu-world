// Ferry dock (content/minigames/ferry-dock.json): steer the drifting ferry to dock gently at the lit pier.
import { defineMinigame } from '../../define-minigame';
import { drawFerryDock } from './draw';
import { createFerryDock, ferryBot } from './logic';

export default defineMinigame({
  sprites: ['ferry', 'rabbit', 'bear', 'droplet'],
  createGame: createFerryDock,
  draw: drawFerryDock,
  bot: ferryBot,
});
