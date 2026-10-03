// Parachute land (content/minigames/parachute-land.json): steer against the wind and land on the X.
import { defineMinigame } from '../../define-minigame';
import { drawParachuteLand } from './draw';
import { createParachuteLand, parachuteBot } from './logic';

export default defineMinigame({
  sprites: ['parachute', 'palm-tree', 'droplet', 'sparkles'],
  createGame: createParachuteLand,
  draw: drawParachuteLand,
  bot: parachuteBot,
});
