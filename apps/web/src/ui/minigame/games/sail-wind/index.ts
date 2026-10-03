// Sail with the wind (content/minigames/sail-wind.json): swing the sail's boom so the wind drives the boat on.
import { defineMinigame } from '../../define-minigame';
import { drawSailWind } from './draw';
import { createSailWind, sailWindBot } from './logic';

export default defineMinigame({
  sprites: ['cloud'],
  createGame: createSailWind,
  draw: drawSailWind,
  bot: sailWindBot,
});
