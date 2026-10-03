// Sack race (content/minigames/sack-race.json): hop to the finish, tapping again as the sack lands.
import { defineMinigame } from '../../define-minigame';
import { drawSackRace } from './draw';
import { createSackRace, RIVALS, sackRaceBot } from './logic';

export default defineMinigame({
  sprites: [...RIVALS],
  createGame: createSackRace,
  draw: drawSackRace,
  bot: sackRaceBot,
});
