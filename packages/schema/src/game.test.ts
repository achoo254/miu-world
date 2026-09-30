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

  it('keeps shared passages and drops every answer of the new mechanics', () => {
    const raw: unknown = JSON.parse(readFileSync(new URL('../../../apps/server/test/fixtures/quests/quest-sgk.json', import.meta.url), 'utf8'));
    const view = QuestView.parse(QuestDefinition.parse(raw));
    if (view.status !== 'active') throw new Error('expected an active quest');
    expect(view.texts['bai-doc']).toEqual({ title: 'Bài đọc thử', author: 'Tác giả thử', body: 'Ngày khai trường đã đến.\n\nTôi chào mẹ.' });
    const keys = keysDeep(view);
    for (const secret of ['answer', 'support', 'assignment', 'fills', 'edges']) expect(keys).not.toContain(secret);
    expect(view.steps.find((s) => s.id === 'read-clock')).toMatchObject({ mechanic: 'clock', mode: 'read', time: { hour: 3, minute: 0 } });
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

  it('accepts the new mechanic shapes within size limits', () => {
    expect(StepAnswer.safeParse({ assignment: { sach: 'su-vat' } }).success).toBe(true);
    expect(StepAnswer.safeParse({ fills: { b1: 'c' } }).success).toBe(true);
    expect(StepAnswer.safeParse({ choices: ['a', 'b'] }).success).toBe(true);
    expect(StepAnswer.safeParse({ hour: 15, minute: 30 }).success).toBe(true);
    expect(StepAnswer.safeParse({ hour: 15 }).success).toBe(false);
    expect(StepAnswer.safeParse({ day: 20 }).success).toBe(true);
    expect(StepAnswer.safeParse({ weekday: 'thu-sau' }).success).toBe(true);
    expect(StepAnswer.safeParse({ edges: [['a', 'b']] }).success).toBe(true);
    expect(StepAnswer.safeParse({ edges: [['a', 'b', 'c']] }).success).toBe(false);
    const big = Object.fromEntries(Array.from({ length: 51 }, (_, i) => [`k${i}`, 'v']));
    expect(StepAnswer.safeParse({ assignment: big }).success).toBe(false);
    expect(StepAnswer.safeParse({ choices: Array.from({ length: 51 }, (_, i) => `c${i}`) }).success).toBe(false);
  });
});
