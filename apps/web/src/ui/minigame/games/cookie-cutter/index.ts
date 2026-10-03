// Cookie cutter (content/minigames/cookie-cutter.json): pack as many cookies as fit on two sheets of dough.
import { defineMinigame } from '../../define-minigame';
import { drawCookieCutter } from './draw';
import { cookieBot, createCookieCutter } from './logic';

export default defineMinigame({
  sprites: [],
  createGame: createCookieCutter,
  draw: drawCookieCutter,
  bot: cookieBot,
});
