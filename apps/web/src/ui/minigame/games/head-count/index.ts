// Head count (content/minigames/head-count.json): friends run in and out of the house; how many are inside?
import { defineMinigame } from '../../define-minigame';
import { drawHeadCount } from './draw';
import { createHeadCount, FRIENDS, headCountBot } from './logic';

export default defineMinigame({
  sprites: [...FRIENDS],
  createGame: createHeadCount,
  draw: drawHeadCount,
  bot: headCountBot,
});
