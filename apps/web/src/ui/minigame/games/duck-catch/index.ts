// Duck catch (content/minigames/duck-catch.json): wade after the ducks, corner them by the fence and lunge.
import { defineMinigame } from '../../define-minigame';
import { drawDuckCatch } from './draw';
import { createDuckCatch, duckBot } from './logic';

export default defineMinigame({
  sprites: ['duck', 'lotus', 'herb', 'droplet', 'basket', 'cat', 'rabbit', 'fox', 'bear'],
  createGame: createDuckCatch,
  draw: drawDuckCatch,
  bot: duckBot,
});
