// Book shelf order (content/minigames/book-shelf-order.json): shelve each numbered book where the row stays in order.
import { defineMinigame } from '../../define-minigame';
import { drawBookShelfOrder } from './draw';
import { bookShelfBot, createBookShelfOrder } from './logic';

export default defineMinigame({
  sprites: ['books', 'package'],
  createGame: createBookShelfOrder,
  draw: drawBookShelfOrder,
  bot: bookShelfBot,
});
