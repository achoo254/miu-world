import { describe, expect, it } from 'vitest';
import { ClientWsMessage, PlayerPresence, ServerWsMessage } from './multiplayer';

describe('multiplayer schema', () => {
  it('validates companion bot presence with label and defaults', () => {
    const raw = {
      id: 'bot-cat-1',
      displayName: 'Bé Bông',
      isBot: true,
      x: 10,
      y: 2,
      z: 20,
    };
    const parsed = PlayerPresence.parse(raw);
    expect(parsed.isBot).toBe(true);
    expect(parsed.species).toBe('cat');
    expect(parsed.action).toBe('idle');
    expect(parsed.outfit).toEqual([]);
  });

  it('validates client join and update messages', () => {
    const join = ClientWsMessage.parse({
      type: 'join',
      mapId: 'trung-tam',
      presence: {
        displayName: 'Mèo Mây',
        isBot: false,
        species: 'cat',
        outfit: ['clothes-tshirt'],
        pet: null,
        x: 400,
        y: 15,
        z: 420,
        yaw: 1.5,
        speed: 0,
        action: 'idle',
        bubble: null,
      },
    });
    expect(join.type).toBe('join');

    const update = ClientWsMessage.parse({
      type: 'update',
      x: 402,
      y: 15,
      z: 422,
      yaw: 1.5,
      speed: 2.5,
      action: 'walk',
    });
    expect(update.type).toBe('update');
  });

  it('validates server broadcast messages', () => {
    const welcome = ServerWsMessage.parse({
      type: 'welcome',
      selfId: 'player-1',
      players: [
        {
          id: 'bot-1',
          displayName: 'Thỏ Nhỏ',
          isBot: true,
          species: 'rabbit',
          outfit: [],
          pet: null,
          x: 100,
          y: 2,
          z: 200,
          yaw: 0,
          speed: 0,
          action: 'idle',
          bubble: null,
        },
      ],
    });
    expect(welcome.type).toBe('welcome');
    if (welcome.type === 'welcome') {
      expect(welcome.players[0]?.isBot).toBe(true);
    }
  });
});
