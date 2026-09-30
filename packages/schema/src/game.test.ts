import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QuestDefinition } from './content';
import { QuestView, StepAnswer } from './game';

const loadQuest = (id: string): QuestDefinition =>
  QuestDefinition.parse(JSON.parse(readFileSync(new URL(`../../../content/quests/${id}.json`, import.meta.url), 'utf8')));

/** Every object key anywhere in the value. */
function keysDeep(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(keysDeep);
  if (value === null || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([k, v]) => [k, ...keysDeep(v)]);
}

describe('QuestView', () => {
  it('drops answers, support layers and authoring notes from the shipped quest', () => {
    const def = loadQuest('forest-ch1');
    expect(keysDeep(def)).toContain('answer');
    const view = QuestView.parse(def);
    const keys = keysDeep(view);
    for (const secret of ['answer', 'support', 'guide', 'hint', 'explanation', 'sevenQuestions', 'phases', 'review']) {
      expect(keys).not.toContain(secret);
    }
    if (view.status !== 'active') throw new Error('expected an active quest');
    expect(view.steps.map((s) => s.id)).toEqual(def.status === 'active' ? def.steps.map((s) => s.id) : []);
  });

  it('shows a stub as coming soon with no content', () => {
    expect(QuestView.parse(loadQuest('forest-ch2'))).toEqual({
      id: 'forest-ch2',
      region: 'khu-rung-bi-mat',
      chapter: 2,
      title: 'Khu rừng bí mật – Chương 2',
      status: 'stub',
    });
  });
});

describe('StepAnswer', () => {
  it('accepts exactly one answer shape', () => {
    expect(StepAnswer.safeParse({ value: 13 }).success).toBe(true);
    expect(StepAnswer.safeParse({ order: ['a', 'b'] }).success).toBe(true);
    expect(StepAnswer.safeParse({ value: 13, choice: 'a' }).success).toBe(false);
    expect(StepAnswer.safeParse({ value: 1.5 }).success).toBe(false);
    expect(StepAnswer.safeParse({}).success).toBe(false);
  });
});
