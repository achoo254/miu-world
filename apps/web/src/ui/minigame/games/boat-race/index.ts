// Boat race (content/minigames/boat-race.json): tap left, right, left… on the beat to paddle to the finish.
import { defineMinigame } from '../../define-minigame';
import { drawBoatRace } from './draw';
import { boatBot, createBoatRace, RIVAL_SPRITES } from './logic';

export default defineMinigame({
  sprites: ['drum', 'deciduous-tree', ...RIVAL_SPRITES],
  createGame: createBoatRace,
  draw: drawBoatRace,
  bot: boatBot,
});
