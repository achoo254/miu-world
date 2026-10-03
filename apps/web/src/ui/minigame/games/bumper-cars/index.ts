// Bumper cars (content/minigames/bumper-cars.json): bump the other cars off the round floor.
import { defineMinigame } from '../../define-minigame';
import { drawBumperCars } from './draw';
import { bumperBot, createBumperCars } from './logic';

export default defineMinigame({
  sprites: ['racing-car', 'automobile', 'collision'],
  createGame: createBumperCars,
  draw: drawBumperCars,
  bot: bumperBot,
});
