// Oẳn tù tì (content/minigames/oan-tu-xi.json): show the hand that wins, or loses, against the friend's.
import { defineMinigame } from '../../define-minigame';
import { drawOanTuXi, FRIENDS, HAND_PICTURE } from './draw';
import { createOanTuXi, oanTuXiBot } from './logic';

export default defineMinigame({
  sprites: [...Object.values(HAND_PICTURE), ...FRIENDS, 'trophy', 'heart', 'sparkles'],
  createGame: createOanTuXi,
  draw: drawOanTuXi,
  bot: oanTuXiBot,
});
