// Boomerang throw (content/minigames/boomerang-throw.json): swipe a boomerang through the fruit, catch it back.
import { defineMinigame } from '../../define-minigame';
import { drawBoomerang } from './draw';
import { boomerangBot, createBoomerang } from './logic';

export default defineMinigame({
  sprites: ['boomerang', 'mango', 'coconut'],
  createGame: createBoomerang,
  draw: drawBoomerang,
  bot: boomerangBot,
});
