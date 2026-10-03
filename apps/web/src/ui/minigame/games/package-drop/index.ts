// Package drop (content/minigames/package-drop.json): tap to drop a gift from a passing plane onto a house or a boat.
import { defineMinigame } from '../../define-minigame';
import { drawPackageDrop } from './draw';
import { createPackageDrop, packageDropBot } from './logic';

export default defineMinigame({
  sprites: ['airplane', 'gift', 'house', 'sailboat', 'sparkles'],
  createGame: createPackageDrop,
  draw: drawPackageDrop,
  bot: packageDropBot,
});
