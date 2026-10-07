import { describe, expect, it } from 'vitest';
import { contentQuestBook, QuestPlan, type BotQuest } from './quest-plan';

const book = contentQuestBook();
const DURING_EVENT = new Date(Date.UTC(2026, 9, 7, 3));
const BEFORE_EVENT = new Date(Date.UTC(2026, 7, 1, 3));

describe("the quests a bot plays on its own", () => {
  it("are the map's real main, story and guardian quests, and an event's only while it is on", () => {
    const school = book.questsOn('truong-hoc', DURING_EVENT).map((q) => q.id);
    expect(school).toContain('toan2-cd1-b01');
    expect(school).toContain('yarn-trong-hoi-lac-nhip-1');
    expect(school).toContain('ward-truong-san-truong');
    // Side games and co-op challenges are played with others, never on its own.
    expect(school.some((id) => id.startsWith('side-') || id.startsWith('with-'))).toBe(false);
    // Another map's quests are not the school's.
    expect(school).not.toContain('wonder-olympic-logic');
    expect(book.questsOn('forest-ch1', DURING_EVENT).map((q) => q.id)).toContain('wonder-olympic-logic');
    expect(book.questsOn('forest-ch1', BEFORE_EVENT).map((q) => q.id)).not.toContain('wonder-olympic-logic');
    expect(book.questsOn('no-such-map', DURING_EVENT)).toEqual([]);
  });

  it("keeps each step's targets and whether it is a question", () => {
    const quest = book.questsOn('truong-hoc', DURING_EVENT).find((q) => q.id === 'toan2-cd1-b01');
    if (!quest) throw new Error('no toan2-cd1-b01');
    expect(quest.steps.length).toBeGreaterThan(5);
    expect(quest.steps.some((s) => s.targets.length > 0 && !s.question)).toBe(true);
    expect(quest.steps.some((s) => s.question)).toBe(true);
  });

  it('goes step by step: a step is done once every target of it is, then the next quest, never the same twice in a row', () => {
    const quests: BotQuest[] = [
      { id: 'q-a', steps: [{ id: 's1', targets: ['npc-a'], question: false }, { id: 's2', targets: ['x', 'y'], question: false }] },
      { id: 'q-b', steps: [{ id: 's1', targets: [], question: true }] },
    ];
    let roll = 0;
    const plan = new QuestPlan(quests, () => [0.9, 0.1][roll++ % 2] ?? 0);
    const first = plan.quest?.id;
    expect(first).toBeDefined();
    if (first === 'q-a') {
      expect(plan.remaining).toEqual(['npc-a']);
      expect(plan.did('elsewhere')).toBe(false);
      expect(plan.did('npc-a')).toBe(true);
      expect(plan.remaining).toEqual(['x', 'y']);
      expect(plan.did('y')).toBe(false);
      expect(plan.remaining).toEqual(['x']);
      expect(plan.did('x')).toBe(true);
    } else {
      expect(plan.did(null)).toBe(true);
    }
    expect(plan.questChanged).toBe(true);
    expect(plan.finished).toBe(1);
    expect(plan.quest?.id).not.toBe(first);
    // A step it gives up on counts as skipped, and it goes on.
    plan.skip();
    expect(plan.skipped).toBe(1);
    expect(new QuestPlan([], Math.random).quest).toBeNull();
  });
});
