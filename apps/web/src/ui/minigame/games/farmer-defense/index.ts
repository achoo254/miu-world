// Farmer defense (content/minigames/farmer-defense.json): place farmers to shoo the birds off the rice.
import { defineMinigame } from '../../define-minigame';
import { drawFarmerDefense } from './draw';
import { createFarmerDefense, farmerDefenseBot } from './logic';

export default defineMinigame({
  sprites: ['farmer', 'bird', 'parrot', 'sheaf-of-rice', 'house'],
  createGame: createFarmerDefense,
  draw: drawFarmerDefense,
  bot: farmerDefenseBot,
});
