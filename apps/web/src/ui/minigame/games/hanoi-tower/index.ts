// Hanoi tower (content/minigames/hanoi-tower.json): move a stack of cake layers to the stand with the star.
import { defineMinigame } from '../../define-minigame';
import { drawHanoiTower } from './draw';
import { createHanoiTower, hanoiBot } from './logic';

export default defineMinigame({
  sprites: ['strawberry', 'star', 'party-popper'],
  createGame: createHanoiTower,
  draw: drawHanoiTower,
  bot: hanoiBot,
});
