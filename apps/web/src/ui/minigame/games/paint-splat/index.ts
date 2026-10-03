// Paint splat (content/minigames/paint-splat.json): tap each part of the picture while the ball has its colour.
import { defineMinigame } from '../../define-minigame';
import { drawPaintSplat } from './draw';
import { createPaintSplat, paintSplatBot } from './logic';

export default defineMinigame({
  sprites: ['artist-palette', 'sparkles'],
  createGame: createPaintSplat,
  draw: drawPaintSplat,
  bot: paintSplatBot,
});
