// One-stroke drawing (content/minigames/one-stroke-house.json): draw over every line once without lifting.
import { defineMinigame } from '../../define-minigame';
import { drawOneStrokeHouse, REWARDS } from './draw';
import { createOneStrokeHouse, oneStrokeBot } from './logic';

export default defineMinigame({
  sprites: [...new Set(REWARDS), 'sparkles'],
  createGame: createOneStrokeHouse,
  draw: drawOneStrokeHouse,
  bot: oneStrokeBot,
});
