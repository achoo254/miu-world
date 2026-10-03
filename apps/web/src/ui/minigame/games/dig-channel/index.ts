// Dig channel (content/minigames/dig-channel.json): dig a channel for the water to reach the duck's tub, avoiding mud.
import { defineMinigame } from '../../define-minigame';
import { drawDigChannel } from './draw';
import { createDigChannel, digChannelBot } from './logic';

export default defineMinigame({
  sprites: ['droplet', 'rock', 'duck'],
  createGame: createDigChannel,
  draw: drawDigChannel,
  bot: digChannelBot,
});
