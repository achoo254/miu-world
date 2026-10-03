// Crane drop (content/minigames/crane-drop.json): tap to let the swinging floor drop onto the tower.
import { defineMinigame } from '../../define-minigame';
import { drawCraneDrop } from './draw';
import { craneDropBot, createCraneDrop } from './logic';

export default defineMinigame({
  sprites: [],
  createGame: createCraneDrop,
  draw: drawCraneDrop,
  bot: craneDropBot,
});
