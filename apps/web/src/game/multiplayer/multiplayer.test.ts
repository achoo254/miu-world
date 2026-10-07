import { describe, expect, it } from 'vitest';
import { createNametag, nametagText } from './multiplayer-nametag';

describe('multiplayer nametags', () => {
  it('creates 3D nametag sprite with proper render order and scale', () => {
    const botNametag = createNametag('Bé Bông', true);
    expect(botNametag.renderOrder).toBe(12);
    expect(botNametag.scale.x).toBeGreaterThan(0);

    const playerNametag = createNametag('Mèo Mây', false);
    expect(playerNametag.renderOrder).toBe(12);
  });

  it('always labels a bot, and marks one busy with a quest and a party member before the name', () => {
    expect(nametagText('Bé Bông', true)).toBe('🤖 [Bạn máy] Bé Bông');
    expect(nametagText('Bé Bông', true, false, true)).toBe('📜 🤖 [Bạn máy] Bé Bông');
    expect(nametagText('Bé Bông', true, true, true)).toBe('⭐ 📜 🤖 [Bạn máy] Bé Bông');
    expect(nametagText('Mèo Mây', false, true)).toBe('⭐ Mèo Mây');
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
