// Bỏ khăn (content/minigames/bo-khan.json): run round the ring, drop the handkerchief unseen, get home first.
import { defineMinigame } from '../../define-minigame';
import { drawBoKhan, FRIEND_LOOKS } from './draw';
import { boKhanBot, createBoKhan } from './logic';

export default defineMinigame({
  sprites: [...FRIEND_LOOKS, 'deciduous-tree', 'sparkles'],
  createGame: createBoKhan,
  draw: drawBoKhan,
  bot: boKhanBot,
});
