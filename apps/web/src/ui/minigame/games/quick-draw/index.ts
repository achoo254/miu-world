// Quick draw (content/minigames/quick-draw.json): tap the moment the lantern lights, before the cat does.
import { defineMinigame } from '../../define-minigame';
import { drawQuickDraw } from './draw';
import { createQuickDraw, quickDrawBot } from './logic';

export default defineMinigame({
  sprites: ['red-paper-lantern', 'cat', 'light-bulb', 'butterfly', 'star', 'party-popper'],
  createGame: createQuickDraw,
  draw: drawQuickDraw,
  bot: quickDrawBot,
});
