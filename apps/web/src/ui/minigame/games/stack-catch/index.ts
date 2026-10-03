// Stack catch (content/minigames/stack-catch.json): slide the plate to stack falling pancakes high, smoothly.
import { defineMinigame } from '../../define-minigame';
import { drawStackCatch } from './draw';
import { createStackCatch, stackCatchBot } from './logic';

export default defineMinigame({
  sprites: ['strawberry', 'cherries', 'crown'],
  createGame: createStackCatch,
  draw: drawStackCatch,
  bot: stackCatchBot,
});
