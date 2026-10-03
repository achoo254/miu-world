// Match three (content/minigames/match-3.json): swap neighbouring fruit to line up three alike.
import { defineMinigame } from '../../define-minigame';
import { drawMatch3 } from './draw';
import { createMatch3, FRUIT, match3Bot } from './logic';

export default defineMinigame({
  sprites: [...FRUIT],
  createGame: createMatch3,
  draw: drawMatch3,
  bot: match3Bot,
});
