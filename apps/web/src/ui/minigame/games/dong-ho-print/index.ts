// Đông Hồ print (content/minigames/dong-ho-print.json): press each colour block right on the sheet's mark.
import { defineMinigame } from '../../define-minigame';
import { drawDongHoPrint } from './draw';
import { createDongHoPrint, dongHoPrintBot, PICTURES } from './logic';

export default defineMinigame({
  sprites: [...PICTURES, 'star'],
  createGame: createDongHoPrint,
  draw: drawDongHoPrint,
  bot: dongHoPrintBot,
});
