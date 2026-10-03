// Math race (content/minigames/math-race.json): tap the answer to the sum on the sign to speed up the car.
import { defineMinigame } from '../../define-minigame';
import { CARS, drawMathRace } from './draw';
import { createMathRace, mathRaceBot } from './logic';

export default defineMinigame({
  sprites: [...CARS, 'fire', 'trophy', 'star'],
  createGame: createMathRace,
  draw: drawMathRace,
  bot: mathRaceBot,
});
