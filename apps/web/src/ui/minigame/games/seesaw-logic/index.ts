// Seesaw logic (content/minigames/seesaw-logic.json): read the seesaws and tap the heaviest (or lightest) friend.
import { defineMinigame } from '../../define-minigame';
import { drawSeesawLogic, FRIEND_PICTURES } from './draw';
import { createSeesawLogic, seesawLogicBot } from './logic';

export default defineMinigame({
  sprites: [...Object.values(FRIEND_PICTURES), 'rock', 'feather', 'sparkles'],
  createGame: createSeesawLogic,
  draw: drawSeesawLogic,
  bot: seesawLogicBot,
});
