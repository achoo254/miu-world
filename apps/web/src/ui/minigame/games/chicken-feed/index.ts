// Chicken feed (content/minigames/chicken-feed.json): toss grain where the chicks can eat before the hens.
import { defineMinigame } from '../../define-minigame';
import { drawChickenFeed } from './draw';
import { chickenFeedBot, createChickenFeed } from './logic';

export default defineMinigame({
  sprites: ['chicken', 'baby-chick', 'hatching-chick', 'sheaf-of-rice'],
  createGame: createChickenFeed,
  draw: drawChickenFeed,
  bot: chickenFeedBot,
});
