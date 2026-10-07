import { describe, expect, it } from 'vitest';
import type { PlayerPresence } from '@miu/schema/multiplayer';
import { personaOf, SIGHT_MAX, SIGHT_MIN, WALK_MAX, WALK_MIN } from '../bot-persona';
import { seePlaces, seePlayers, type SeenMember } from './sight';
import { openMap, drawnMap } from './walk-fixtures';

const presence = (id: string, x: number, z: number): PlayerPresence => ({
  id, displayName: id, isBot: false, species: 'cat', outfit: [], pet: null, petGear: [], x, y: 1, z, yaw: 0, speed: 0, action: 'idle', riding: false, bubble: null,
});

describe('what a bot sees', () => {
  it('has a sight and a pace of its own, the same wherever it is', () => {
    const personas = Array.from({ length: 200 }, (_, i) => personaOf(`bot-x-${i}`));
    for (const p of personas) {
      expect(p.sight).toBeGreaterThanOrEqual(SIGHT_MIN);
      expect(p.sight).toBeLessThanOrEqual(SIGHT_MAX);
      expect(p.walk).toBeGreaterThanOrEqual(WALK_MIN);
      expect(p.walk).toBeLessThanOrEqual(WALK_MAX);
    }
    expect(new Set(personas.map((p) => p.sight)).size).toBeGreaterThan(8);
    expect(personaOf('bot-tt-1@c7').sight).toBe(personaOf('bot-tt-1').sight);
  });

  it('sees the places within its sight only, nearest first', () => {
    const places = [
      { id: 'far', kind: 'landmark' as const, at: [40.5, 1, 10.5] as [number, number, number] },
      { id: 'mid', kind: 'npc' as const, at: [18.5, 1, 10.5] as [number, number, number] },
      { id: 'near', kind: 'object' as const, at: [12.5, 1, 11.5] as [number, number, number] },
    ];
    const map = drawnMap(['1'], { places });
    expect(seePlaces(map, { x: 10, z: 10 }, 16).map((p) => p.id)).toEqual(['near', 'mid']);
    expect(seePlaces(openMap(4), { x: 1, z: 1 }, 16)).toEqual([]);
  });

  it('sees the players within its sight who may see it, never bots, nearest first', () => {
    const members = new Map<string, SeenMember>([
      ['p-far', { id: 'p-far', isBot: false, presence: presence('p-far', 40, 10) }],
      ['p-near', { id: 'p-near', isBot: false, presence: presence('p-near', 12, 10) }],
      ['p-mid', { id: 'p-mid', isBot: false, presence: presence('p-mid', 20, 10) }],
      ['p-off', { id: 'p-off', isBot: false, presence: presence('p-off', 11, 10) }],
      ['bot-b', { id: 'bot-b', isBot: true, presence: presence('bot-b', 10, 11) }],
    ]);
    // p-off switched bots off: she and the bot do not see each other.
    const room = { members, canSee: (viewer: string) => viewer !== 'p-off' };
    expect(seePlayers(room, 'bot-a', { x: 10, z: 10 }, 16).map((m) => m.id)).toEqual(['p-near', 'p-mid']);
  });
});
