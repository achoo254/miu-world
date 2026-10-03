// Water pistol (content/minigames/water-pistol.json): hold to spray the fairground ducks off their shelves.
import { defineMinigame } from '../../define-minigame';
import { drawWaterPistol } from './draw';
import { createWaterPistol, waterPistolBot } from './logic';

export default defineMinigame({
  sprites: ['duck', 'bullseye', 'water-pistol', 'droplet'],
  createGame: createWaterPistol,
  draw: drawWaterPistol,
  bot: waterPistolBot,
});
