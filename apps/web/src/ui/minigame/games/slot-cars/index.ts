// Slot cars (content/minigames/slot-cars.json): hold to speed up, let go before the bends, win three laps.
import { defineMinigame } from '../../define-minigame';
import { drawSlotCars } from './draw';
import { createSlotCars, slotCarsBot } from './logic';

export default defineMinigame({
  sprites: ['fox'],
  createGame: createSlotCars,
  draw: drawSlotCars,
  bot: slotCarsBot,
});
