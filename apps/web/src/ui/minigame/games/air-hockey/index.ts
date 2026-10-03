// Air hockey (content/minigames/air-hockey.json): drag the paddle to score in the penguin's goal.
import { defineMinigame } from '../../define-minigame';
import { drawAirHockey } from './draw';
import { airHockeyBot, createAirHockey } from './logic';

export default defineMinigame({
  sprites: ['penguin'],
  createGame: createAirHockey,
  draw: drawAirHockey,
  bot: airHockeyBot,
});
