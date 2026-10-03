// Clock catch (content/minigames/clock-catch.json): stop the running hands on the time the rooster asks for.
import { defineMinigame } from '../../define-minigame';
import { drawClockCatch } from './draw';
import { clockCatchBot, createClockCatch } from './logic';

export default defineMinigame({
  sprites: ['bell', 'chicken', 'sparkles'],
  createGame: createClockCatch,
  draw: drawClockCatch,
  bot: clockCatchBot,
});
