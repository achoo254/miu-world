// Lion dance arrows (content/minigames/lion-dance-arrows.json): swipe each arrow's way on the drum beat.
import { defineMinigame } from '../../define-minigame';
import { drawLionDance } from './draw';
import { createLionDance, lionDanceBot } from './logic';

export default defineMinigame({
  sprites: ['dragon-face', 'drum', 'red-paper-lantern'],
  createGame: createLionDance,
  draw: drawLionDance,
  bot: lionDanceBot,
});
