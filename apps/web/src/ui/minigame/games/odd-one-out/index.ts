// Odd one out (content/minigames/odd-one-out.json): tap the picture that is not from the same group.
import { defineMinigame } from '../../define-minigame';
import { drawOddOneOut } from './draw';
import { createOddOneOut, GROUPS, oddOneOutBot } from './logic';

export default defineMinigame({
  sprites: [...new Set(Object.values(GROUPS).flat()), 'sparkles'],
  createGame: createOddOneOut,
  draw: drawOddOneOut,
  bot: oddOneOutBot,
});
