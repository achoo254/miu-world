// Sink or float (content/minigames/sink-float.json): guess, before it drops, whether each thing floats.
import { defineMinigame } from '../../define-minigame';
import { drawSinkFloat } from './draw';
import { createSinkFloat, FLOATS, SINKS, sinkFloatBot } from './logic';

export default defineMinigame({
  sprites: [...FLOATS, ...SINKS, 'star'],
  createGame: createSinkFloat,
  draw: drawSinkFloat,
  bot: sinkFloatBot,
});
