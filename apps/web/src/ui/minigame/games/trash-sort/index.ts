// Trash sort (content/minigames/trash-sort.json): drag each piece of rubbish into the right bin.
import { defineMinigame } from '../../define-minigame';
import { drawTrashSort } from './draw';
import { createTrashSort, TRASH, trashBot } from './logic';

export default defineMinigame({
  sprites: ['leaf', 'recycling-symbol', 'wastebasket', ...TRASH.organic, ...TRASH.recycle, ...TRASH.other],
  createGame: createTrashSort,
  draw: drawTrashSort,
  bot: trashBot,
});
