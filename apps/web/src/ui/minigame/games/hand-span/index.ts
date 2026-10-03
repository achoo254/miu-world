// Hand span (content/minigames/hand-span.json): lay hand spans end to end along a thing, then say how many.
import { defineMinigame } from '../../define-minigame';
import { drawHandSpan } from './draw';
import { createHandSpan, handSpanBot } from './logic';

export default defineMinigame({
  sprites: ['hand-with-fingers-splayed', 'sparkles'],
  createGame: createHandSpan,
  draw: drawHandSpan,
  bot: handSpanBot,
});
