// Snake dragon (content/minigames/snake-dragon.json): swipe to lead a line of friends and pick up more.
import { defineMinigame } from '../../define-minigame';
import { drawSnakeDragon, FRIENDS } from './draw';
import { createSnakeDragon, snakeBot } from './logic';

export default defineMinigame({
  sprites: [...FRIENDS, 'cat', 'rabbit', 'fox', 'bear'],
  createGame: createSnakeDragon,
  draw: drawSnakeDragon,
  bot: snakeBot,
});
