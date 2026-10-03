// Kart race (content/minigames/kart-race.json): steer a kart with a finger, two laps against three friends.
import { defineMinigame } from '../../define-minigame';
import { drawKartRace } from './draw';
import { createKartRace, kartBot } from './logic';

export default defineMinigame({
  sprites: ['fox', 'panda', 'monkey-face', 'rabbit', 'star', 'trophy', '1st-place-medal', 'deciduous-tree', 'evergreen-tree'],
  createGame: createKartRace,
  draw: drawKartRace,
  bot: kartBot,
});
