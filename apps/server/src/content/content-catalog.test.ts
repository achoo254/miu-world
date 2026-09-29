import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContentCatalog, loadQuests } from './content-catalog';

function questDir(quests: unknown[]): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'miu-quests-'));
  quests.forEach((q, i) => writeFileSync(path.join(dir, `q${i}.json`), JSON.stringify(q)));
  return dir;
}

const skills = new Set(['doc-hieu']);
const base = { region: 'khu-rung-bi-mat', steps: [{ id: 's' }], reward: {} };

describe('content catalogue', () => {
  it('loads the shipped content (no quests yet, two accessories)', () => {
    const catalog = loadContentCatalog();
    expect(catalog.quests.size).toBe(0);
    expect(catalog.accessories.get('hat-witch-pink')).toBe('hat');
    expect(catalog.accessories.get('backpack-brown')).toBe('back');
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

  it('records which quests unlock which', () => {
    const dir = questDir([{ ...base, id: 'a', unlock: ['b'] }, { ...base, id: 'b' }]);
    const catalog = loadContentCatalog({ questDir: dir });
    expect(catalog.unlockedBy.get('b')).toEqual(['a']);
    expect(catalog.unlockedBy.has('a')).toBe(false);
  });
});
