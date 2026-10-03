// Train switch (content/minigames/train-switch.json): tap the forks so every train reaches its own station.
import { defineMinigame } from '../../define-minigame';
import { drawTrainSwitch } from './draw';
import { createTrainSwitch, SIGNS, trainSwitchBot } from './logic';

export default defineMinigame({
  sprites: [...SIGNS],
  createGame: createTrainSwitch,
  draw: drawTrainSwitch,
  bot: trainSwitchBot,
});
