import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTENT_DIR, loadContentCatalog, loadQuests, questTextbooks } from './content-catalog';

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

  it('validates drafts but never loads them', () => {
    const sgk = JSON.parse(readFileSync(new URL('../../test/fixtures/quests/quest-sgk.json', import.meta.url), 'utf8')) as Record<string, unknown>;
    // Textbook quests need feedback lines on every learning step, none reused.
    const steps = (sgk.steps as Array<Record<string, unknown>>).map((s) =>
      'support' in s ? { ...s, feedback: { right: [1, 2, 3].map((n) => `${String(s.id)} ${n}`), wrong: [4, 5, 6].map((n) => `${String(s.id)} ${n}`) } } : s,
    );
    // ...and say where to go: every step here happens at the ancient tree.
    const places = Object.fromEntries(steps.flatMap((s) => (s.kind === 'search' ? [[s.id, 'cây cổ thụ']] : s.target ? [[s.target, 'cây cổ thụ']] : [])));
    const walked = steps.map((s) => ({ ...s, goTo: 'Đến cây cổ thụ' }));
    const draft = { ...sgk, id: 'tv2-t01-b01', status: 'draft', lesson: 'tv2-t1-b01', steps: walked, places };
    const loaded = loadQuests(questDir([{ ...base, id: 'a' }, draft]), new Set([...skills, 'phep-cong']));
    expect([...loaded.keys()]).toEqual(['a']);
    // Textbook lessons open in any order: nothing may lock one, not even another lesson.
    expect(() => loadQuests(questDir([{ ...draft, unlock: ['tv2-t01-b02'] }]), skills)).toThrow(/unlocks nothing/);
    expect(() => loadQuests(questDir([{ ...draft, phases: {} }]), skills)).toThrow(/invalid content file/);
  });

  it('reads the title and printed pages of the lesson a quest plays', () => {
    const quests = loadQuests(questDir([{ ...base, id: 'a', lesson: 'tv2-t1-b02' }, { ...base, id: 'b' }]), skills);
    const textbooks = questTextbooks(quests.values(), path.join(CONTENT_DIR, 'curriculum'));
    expect(Object.fromEntries(textbooks)).toEqual({ a: { book: 'Tiếng Việt 2, tập một', lesson: 'Bài 2. Ngày hôm qua đâu rồi?', pages: [13, 16] } });
    const ghost = loadQuests(questDir([{ ...base, id: 'a', lesson: 'tv2-t1-b99' }]), skills);
    expect(() => questTextbooks(ghost.values(), path.join(CONTENT_DIR, 'curriculum'))).toThrow('quest a plays unknown textbook lesson tv2-t1-b99');
  });

  it('records which quests unlock which', () => {
    const dir = questDir([{ ...base, id: 'a', unlock: ['b'] }, { ...base, id: 'b' }]);
    const catalog = loadContentCatalog({ questDir: dir });
    expect(catalog.unlockedBy.get('b')).toEqual(['a']);
    expect(catalog.unlockedBy.has('a')).toBe(false);
  });
});
