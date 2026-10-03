// Story order (content/minigames/story-order.json): put a little story's four pictures in the order they happen.
import { defineMinigame } from '../../define-minigame';
import { drawStoryOrder } from './draw';
import { createStoryOrder, storyOrderBot } from './logic';
import { STORY_SPRITES } from './stories';

export default defineMinigame({
  sprites: STORY_SPRITES,
  createGame: createStoryOrder,
  draw: drawStoryOrder,
  bot: storyOrderBot,
});
