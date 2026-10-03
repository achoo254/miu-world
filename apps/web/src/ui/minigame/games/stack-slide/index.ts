// Stack slide (content/minigames/stack-slide.json): tap to drop each sliding floor right on the one below.
import { defineMinigame } from '../../define-minigame';
import { drawStackSlide } from './draw';
import { createStackSlide, stackSlideBot } from './logic';

export default defineMinigame({
  sprites: ['star'],
  createGame: createStackSlide,
  draw: drawStackSlide,
  bot: stackSlideBot,
});
