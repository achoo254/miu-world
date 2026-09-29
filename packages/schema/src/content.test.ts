import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ConsentDocument, NameList, QuestDefinition, SkillCatalog } from './content';

describe('content schema', () => {
  it('validates the shipped skill catalogue', () => {
    const raw: unknown = JSON.parse(readFileSync(new URL('../../../content/learning/skills.json', import.meta.url), 'utf8'));
    const catalog = SkillCatalog.parse(raw);
    expect(catalog.subjects.map((s) => s.id)).toEqual(['toan', 'tieng-viet', 'english']);
  });

  it('rejects duplicate skill ids across subjects', () => {
    const dup = {
      subjects: [
        { id: 'a', name: 'A', skills: [{ id: 'x', name: 'X' }] },
        { id: 'b', name: 'B', skills: [{ id: 'x', name: 'X' }] },
      ],
    };
    expect(SkillCatalog.safeParse(dup).success).toBe(false);
  });

  it('parses a quest with reward defaults and rejects duplicate steps', () => {
    const quest = QuestDefinition.parse({ id: 'q-1', region: 'khu-rung-bi-mat', steps: [{ id: 's1' }], reward: { xp: 10 } });
    expect(quest.reward).toEqual({ xp: 10, coin: 0, skillXp: {}, items: {} });
    expect(quest.unlock).toEqual([]);
    const dup = { id: 'q', region: 'r', steps: [{ id: 's' }, { id: 's' }], reward: {} };
    expect(QuestDefinition.safeParse(dup).success).toBe(false);
  });

  it('rejects non-kebab-case ids', () => {
    expect(QuestDefinition.safeParse({ id: 'Quest 1', region: 'r', steps: [{ id: 's' }], reward: {} }).success).toBe(false);
  });
});

describe('shipped account content', () => {
  const load = (rel: string): unknown => JSON.parse(readFileSync(new URL(`../../../content/${rel}`, import.meta.url), 'utf8'));

  it('has unique pick-from-list names', () => {
    expect(NameList.parse(load('names/child-display-names.json')).names.length).toBeGreaterThanOrEqual(12);
    expect(NameList.parse(load('names/character-names.json')).names).toContain('Miu');
  });

  it('marks the draft consent as needing legal review', () => {
    const doc = ConsentDocument.parse(load('legal/consent-vi.json'));
    expect(doc.requiresLegalReview).toBe(true);
    expect(doc.version).toBe('draft-1');
  });
});
