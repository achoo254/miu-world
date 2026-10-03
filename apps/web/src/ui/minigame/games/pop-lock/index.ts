// Pop the lock (content/minigames/pop-lock.json): tap when the sweeping needle is on the golden dot.
import { defineMinigame } from '../../define-minigame';
import { drawPopLock } from './draw';
import { createPopLock, popLockBot } from './logic';

export default defineMinigame({
  sprites: ['coin', 'gem', 'crown', 'unlocked'],
  createGame: createPopLock,
  draw: drawPopLock,
  bot: popLockBot,
});
