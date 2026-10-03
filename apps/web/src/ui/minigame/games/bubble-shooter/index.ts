// Bubble shooter (content/minigames/bubble-shooter.json): aim, shoot, pop three or more of a colour.
import { defineMinigame } from '../../define-minigame';
import { drawBubbleShooter } from './draw';
import { bubbleShooterBot, createBubbleShooter } from './logic';

export default defineMinigame({
  sprites: ['heart', 'star', 'leaf', 'droplet'],
  createGame: createBubbleShooter,
  draw: drawBubbleShooter,
  bot: bubbleShooterBot,
});
