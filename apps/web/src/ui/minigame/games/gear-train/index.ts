// Gear train (content/minigames/gear-train.json): put the right gears on the pegs to join the crank to the millstone.
import { defineMinigame } from '../../define-minigame';
import { drawGearTrain } from './draw';
import { createGearTrain, gearBot } from './logic';

export default defineMinigame({
  sprites: ['cloud'],
  createGame: createGearTrain,
  draw: drawGearTrain,
  bot: gearBot,
});
