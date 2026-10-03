// Goalkeeper (content/minigames/goalkeeper.json): tap where the ball is going to save it.
import { defineMinigame } from '../../define-minigame';
import { drawGoalkeeper } from './draw';
import { createGoalkeeper, goalkeeperBot } from './logic';

export default defineMinigame({
  sprites: ['panda', 'soccer-ball', 'gloves'],
  createGame: createGoalkeeper,
  draw: drawGoalkeeper,
  bot: goalkeeperBot,
});
