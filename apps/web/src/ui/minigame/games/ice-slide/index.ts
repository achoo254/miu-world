// Ice slide (content/minigames/ice-slide.json): swipe the sliding penguin across the ice to its house.
import { defineMinigame } from '../../define-minigame';
import { drawIceSlide } from './draw';
import { createIceSlide, iceSlideBot } from './logic';

export default defineMinigame({
  sprites: ['penguin', 'rock', 'house', 'sparkles'],
  createGame: createIceSlide,
  draw: drawIceSlide,
  bot: iceSlideBot,
});
