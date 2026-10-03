// Pick-up sticks (content/minigames/pick-sticks.json): lift out the sticks that nothing lies on.
import { defineMinigame } from '../../define-minigame';
import { drawPickSticks } from './draw';
import { createPickSticks, pickSticksBot } from './logic';

export default defineMinigame({
  sprites: [],
  createGame: createPickSticks,
  draw: drawPickSticks,
  bot: pickSticksBot,
});
