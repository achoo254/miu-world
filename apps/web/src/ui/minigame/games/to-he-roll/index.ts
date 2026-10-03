// Tò he roll (content/minigames/to-he-roll.json): roll the dough to the asked centimetres on the ruler, then cut.
import { defineMinigame } from '../../define-minigame';
import { drawToHeRoll } from './draw';
import { createToHeRoll, toHeRollBot } from './logic';

export default defineMinigame({
  sprites: ['rabbit', 'fox', 'panda', 'monkey-face', 'cat-face', 'dog-face', 'bear', 'owl', 'bird'],
  createGame: createToHeRoll,
  draw: drawToHeRoll,
  bot: toHeRollBot,
});
