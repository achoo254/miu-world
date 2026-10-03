// Hide and seek (content/minigames/hide-and-seek.json): tap where a friend was seen peeking.
import { defineMinigame } from '../../define-minigame';
import { drawHideAndSeek } from './draw';
import { createHideAndSeek, FRIENDS, hideAndSeekBot, PLACES } from './logic';

export default defineMinigame({
  sprites: [...new Set(PLACES), ...FRIENDS],
  createGame: createHideAndSeek,
  draw: drawHideAndSeek,
  bot: hideAndSeekBot,
});
