// Recipe assembly (content/minigames/recipe-assembly.json): put the fillings on the bánh mì in the order asked.
import { defineMinigame } from '../../define-minigame';
import { drawRecipeAssembly } from './draw';
import { createRecipeAssembly, CUSTOMERS, FILLINGS, recipeAssemblyBot } from './logic';

export default defineMinigame({
  sprites: [...FILLINGS, ...CUSTOMERS, 'baguette-bread', 'star'],
  createGame: createRecipeAssembly,
  draw: drawRecipeAssembly,
  bot: recipeAssemblyBot,
});
