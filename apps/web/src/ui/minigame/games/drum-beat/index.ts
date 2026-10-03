// Drum beat (content/minigames/drum-beat.json): strike the drum's middle or rim as each note reaches the ring.
import { defineMinigame } from '../../define-minigame';
import { drawDrumBeat } from './draw';
import { createDrumBeat, drumBeatBot } from './logic';

export default defineMinigame({
  sprites: ['drum'],
  createGame: createDrumBeat,
  draw: drawDrumBeat,
  bot: drumBeatBot,
});
