// Call and response (content/minigames/call-response.json): Vẹt claps a rhythm, the child taps it back.
import { defineMinigame } from '../../define-minigame';
import { drawCallResponse } from './draw';
import { callResponseBot, createCallResponse } from './logic';

export default defineMinigame({
  sprites: ['parrot', 'drum', 'star'],
  createGame: createCallResponse,
  draw: drawCallResponse,
  bot: callResponseBot,
});
