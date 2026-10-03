// Snap match (content/minigames/snap-match.json): tap when the new card repeats the last one, before the monkey.
import { defineMinigame } from '../../define-minigame';
import { drawSnapMatch, FACES } from './draw';
import { createSnapMatch, snapMatchBot } from './logic';

export default defineMinigame({
  sprites: [...new Set(Object.values(FACES).flat()), 'monkey-face', 'sparkles'],
  createGame: createSnapMatch,
  draw: drawSnapMatch,
  bot: snapMatchBot,
});
