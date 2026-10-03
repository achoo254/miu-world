// Robot vacuum (content/minigames/robot-path.json): program the robot to pick up all the dust, then run it.
import { defineMinigame } from '../../define-minigame';
import { drawRobotPath, FURNITURE } from './draw';
import { createRobotPath, robotPathBot } from './logic';

export default defineMinigame({
  sprites: [...FURNITURE, 'robot', 'sparkles'],
  createGame: createRobotPath,
  draw: drawRobotPath,
  bot: robotPathBot,
});
