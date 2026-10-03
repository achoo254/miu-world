// Dig tunnel (content/minigames/dig-tunnel.json): dig toward the gems, keep out from under the rocks.
import { defineMinigame } from '../../define-minigame';
import { drawDigTunnel } from './draw';
import { createDigTunnel, digTunnelBot } from './logic';

export default defineMinigame({
  sprites: ['gem', 'rock', 'collision'],
  createGame: createDigTunnel,
  draw: drawDigTunnel,
  bot: digTunnelBot,
});
