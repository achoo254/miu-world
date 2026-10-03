// Jar estimate (content/minigames/jar-estimate.json): guess the sweets in the jar, then count them by tens.
import { defineMinigame } from '../../define-minigame';
import { drawJarEstimate } from './draw';
import { createJarEstimate, jarBot } from './logic';

export default defineMinigame({
  sprites: ['jar', 'candy', 'lollipop', 'cookie'],
  createGame: createJarEstimate,
  draw: drawJarEstimate,
  bot: jarBot,
});
