// Ông đồ calligraphy (content/minigames/ong-do-calligraphy.json): trace each stroke of a Tết word slowly for dark ink.
import { defineMinigame } from '../../define-minigame';
import { drawCalligraphy } from './draw';
import { calligraphyBot, createCalligraphy } from './logic';

export default defineMinigame({
  sprites: ['paintbrush', 'red-paper-lantern', 'sparkles'],
  createGame: createCalligraphy,
  draw: drawCalligraphy,
  bot: calligraphyBot,
});
