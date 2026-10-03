// Shell game (content/minigames/shell-game.json): follow the gem's bowl while the bowls swap, then tap it.
import { defineMinigame } from '../../define-minigame';
import { drawShellGame } from './draw';
import { createShellGame, shellGameBot } from './logic';

export default defineMinigame({
  sprites: ['gem', 'sparkles'],
  createGame: createShellGame,
  draw: drawShellGame,
  bot: shellGameBot,
});
