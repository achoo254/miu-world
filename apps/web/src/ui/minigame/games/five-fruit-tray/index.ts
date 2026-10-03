// Five-fruit tray (content/minigames/five-fruit-tray.json): lay all five fruits on the tray, no twins side by side.
import { defineMinigame } from '../../define-minigame';
import { drawFiveFruitTray } from './draw';
import { createFiveFruitTray, fiveFruitBot, FRUITS } from './logic';

export default defineMinigame({
  sprites: [...FRUITS, 'basket'],
  createGame: createFiveFruitTray,
  draw: drawFiveFruitTray,
  bot: fiveFruitBot,
});
