// Flag commands (content/minigames/flag-commands.json): read the command and swipe the red or blue flag up or down.
import { defineMinigame } from '../../define-minigame';
import { drawFlagCommands } from './draw';
import { createFlagCommands, flagBot } from './logic';

export default defineMinigame({
  sprites: [],
  createGame: createFlagCommands,
  draw: drawFlagCommands,
  bot: flagBot,
});
