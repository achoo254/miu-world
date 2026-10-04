import { describe, expect, it } from 'vitest';
import { isBotsEnabled, setBotsEnabled } from './remote-player-manager';
import { createNametag } from './multiplayer-nametag';

describe('multiplayer client and nametags', () => {
  it('toggles companion bots setting in storage', () => {
    setBotsEnabled(true);
    expect(isBotsEnabled()).toBe(true);

    setBotsEnabled(false);
    expect(isBotsEnabled()).toBe(false);

    // Reset back to default true
    setBotsEnabled(true);
    expect(isBotsEnabled()).toBe(true);
  });

  it('creates 3D nametag sprite with proper render order and scale', () => {
    const botNametag = createNametag('Bé Bông', true);
    expect(botNametag.renderOrder).toBe(12);
    expect(botNametag.scale.x).toBeGreaterThan(0);

    const playerNametag = createNametag('Mèo Mây', false);
    expect(playerNametag.renderOrder).toBe(12);
  });
});

import { isAirborne } from './remote-player-manager';
describe('remote players jumping', () => {
  it('draws a player in the air when her feet are clear of the ground, and on it on a step or a slope', () => {
    expect(isAirborne(14.4, 13)).toBe(true);
    expect(isAirborne(13.2, 13)).toBe(false);
    expect(isAirborne(13, 13)).toBe(false);
  });
});
