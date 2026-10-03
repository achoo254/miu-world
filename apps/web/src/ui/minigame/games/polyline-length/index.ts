// Polyline length (content/minigames/polyline-length.json): trace a way of exactly the asked centimetres.
import { defineMinigame } from '../../define-minigame';
import { drawPolylineLength } from './draw';
import { createPolylineLength, polylineBot } from './logic';

export default defineMinigame({
  sprites: ['snail', 'leafy-green', 'sparkles'],
  createGame: createPolylineLength,
  draw: drawPolylineLength,
  bot: polylineBot,
});
