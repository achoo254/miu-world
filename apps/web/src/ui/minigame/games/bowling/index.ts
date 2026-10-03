// Bowling (content/minigames/bowling.json): place the ball, swipe up, knock the pins down.
import { defineMinigame } from '../../define-minigame';
import { drawBowling } from './draw';
import { bowlingBot, createBowling } from './logic';

export default defineMinigame({
  sprites: [],
  createGame: createBowling,
  draw: drawBowling,
  bot: bowlingBot,
});
