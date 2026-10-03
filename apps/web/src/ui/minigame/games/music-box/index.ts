// Music box (content/minigames/music-box.json): set the pins so the music box plays the tune it played.
import { defineMinigame } from '../../define-minigame';
import { drawMusicBox } from './draw';
import { createMusicBox, musicBoxBot } from './logic';

export default defineMinigame({
  sprites: ['musical-note', 'bell'],
  createGame: createMusicBox,
  draw: drawMusicBox,
  bot: musicBoxBot,
});
