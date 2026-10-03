// Cable car (content/minigames/cable-car.json): board waiting groups into cabins that still have room for them.
import { defineMinigame } from '../../define-minigame';
import { drawCableCar, RIDERS } from './draw';
import { cableCarBot, createCableCar } from './logic';

export default defineMinigame({
  sprites: RIDERS,
  createGame: createCableCar,
  draw: drawCableCar,
  bot: cableCarBot,
});
