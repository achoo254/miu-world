import { describe, expect, it } from 'vitest';
import { SET_SIZE, collectibleIssues, collectionOfSource, collectionSource, type CollectibleCatalog, type CollectibleSet } from './collectible';

const set = (mapId: string, prefix: string, size = SET_SIZE): CollectibleSet => ({
  mapId,
  name: 'Bộ thử',
  description: 'Bộ đồ thử.',
  reward: { coins: 150, title: 'Danh hiệu thử' },
  items: Array.from({ length: size }, (_, i) => ({ id: `${prefix}-${i}`, rarity: 'common' as const, lore: 'Chuyện.' })),
});
const catalog = (...sets: CollectibleSet[]): CollectibleCatalog => ({ version: 1, sets });
const kinds = (ids: string[], kind = 'collectible') => new Map(ids.map((id) => [id, { kind }]));
const regions = new Set(['rung', 'song']);

describe('collectible sets', () => {
  it('accepts ten distinct collectible items a set, one set per region', () => {
    const items = kinds([...set('rung', 'a').items, ...set('song', 'b').items].map((e) => e.id));
    expect(collectibleIssues(catalog(set('rung', 'a'), set('song', 'b')), { regions, items })).toEqual([]);
  });

  it('reports unknown regions, twice-listed sets, wrong sizes, shared things and items that do not fit', () => {
    const issues = collectibleIssues(catalog(set('rung', 'a'), set('rung', 'a', 9), set('nui', 'c')), {
      regions,
      items: new Map([...kinds(set('rung', 'a').items.map((e) => e.id)), ['c-0', { kind: 'material' }], ['lost', { kind: 'collectible' }]]),
    });
    expect(issues).toEqual(
      expect.arrayContaining([
        'set rung: listed twice',
        'set rung: 9 things, not 10',
        'set rung: a-0 is in another set too',
        'set nui: no such region',
        'set nui: item c-0 is not of kind collectible',
        'set nui: c-1 has no content/items/c-1.json',
        'item lost is a collectible in no set',
      ]),
    );
  });

  it('names a set reward in the ledger and reads it back', () => {
    expect(collectionOfSource(collectionSource('rung'))).toBe('rung');
    expect(collectionOfSource('region:rung:full')).toBeNull();
  });
});
