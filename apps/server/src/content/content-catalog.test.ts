import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContentCatalog, loadQuests } from './content-catalog';

function questDir(quests: unknown[]): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'miu-quests-'));
  quests.forEach((q, i) => writeFileSync(path.join(dir, `q${i}.json`), JSON.stringify(q)));
  return dir;
}

const skills = new Set(['doc-hieu', 'phep-cong']);
/** A valid fixture quest without unlocks; each test changes its id and links. */
const { unlock: _unlock, ...base } = JSON.parse(
  readFileSync(new URL('../../test/fixtures/quests/quest-c.json', import.meta.url), 'utf8'),
) as Record<string, unknown>;

describe('content catalogue', () => {
  it('loads the shipped content: chapter 1 unlocks the chapter 2 stub', () => {
    const catalog = loadContentCatalog();
    expect([...catalog.quests.keys()]).toEqual(['forest-ch1', 'forest-ch2']);
    expect(catalog.quests.get('forest-ch1')?.status).toBe('active');
    expect(catalog.quests.get('forest-ch2')?.status).toBe('stub');
    expect(catalog.unlockedBy.get('forest-ch2')).toEqual(['forest-ch1']);
    expect(catalog.accessories.get('hat-witch-pink')?.slot).toBe('hat');
    expect(catalog.accessories.get('backpack-brown')?.slot).toBe('back');
    expect(catalog.accessories.get('hat-witch-night')).toMatchObject({ slot: 'hat', variant: 'night', unlock: { level: 2 } });
    expect(catalog.accessories.get('hat-flower-crown')?.unlock).toEqual({ quest: 'forest-ch1' });
    expect(catalog.skillIds.has('doc-hieu')).toBe(true);
    expect(catalog.characterNames.has('Miu')).toBe(true);
  });

  it('refuses quests that reward unknown skills or unlock unknown quests', () => {
    expect(() => loadQuests(questDir([{ ...base, id: 'a', reward: { skillXp: { bay: 1 } } }]), skills)).toThrow(/unknown skill/);
    expect(() => loadQuests(questDir([{ ...base, id: 'a', unlock: ['ghost'] }]), skills)).toThrow(/unknown quest/);
    expect(() => loadQuests(questDir([{ ...base, id: 'a' }, { ...base, id: 'a' }]), skills)).toThrow(/duplicate/);
    const cycle = [{ ...base, id: 'root' }, { ...base, id: 'a', unlock: ['b'] }, { ...base, id: 'b', unlock: ['a'] }];
    expect(() => loadQuests(questDir(cycle), skills)).toThrow(/locked forever.*a, b/);
  });

  it('refuses a quest file that breaks the schema', () => {
    expect(() => loadQuests(questDir([{ ...base, id: 'a', sevenQuestions: {} }]), skills)).toThrow(/invalid content file q0.json/);
  });

  it('records which quests unlock which', () => {
    const dir = questDir([{ ...base, id: 'a', unlock: ['b'] }, { ...base, id: 'b' }]);
    const catalog = loadContentCatalog({ questDir: dir });
    expect(catalog.unlockedBy.get('b')).toEqual(['a']);
    expect(catalog.unlockedBy.has('a')).toBe(false);
  });
});
