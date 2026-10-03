// Pétanque (content/minigames/petanque.json): lob steel balls close to the jack, taking turns with the owl.
import { defineMinigame } from '../../define-minigame';
import { drawPetanque } from './draw';
import { createPetanque, petanqueBot } from './logic';

export default defineMinigame({
  sprites: ['owl'],
  createGame: createPetanque,
  draw: drawPetanque,
  bot: petanqueBot,
});
