import { describe, expect, it } from 'vitest';
import { QuestDefinition } from '@miu/schema/content';
import { completeStep, emptyProgress } from './quest-progress';

const quest = QuestDefinition.parse({
  id: 'forest-ch1',
  region: 'khu-rung-bi-mat',
  steps: [{ id: 'meet-vet' }, { id: 'find-letter' }, { id: 'solve-tree' }],
  reward: { xp: 100, coin: 20, skillXp: { 'doc-hieu': 1 }, items: { 'la-than': 1 } },
  unlock: ['forest-ch2'],
});

describe('completeStep', () => {
  it('advances linearly and pays the reward only on the last step', () => {
    let progress = emptyProgress();
    for (const stepId of ['meet-vet', 'find-letter']) {
      const result = completeStep(quest, progress, stepId);
      if (!result.ok) throw new Error(result.error);
      expect(result.reward).toBeNull();
      expect(result.progress.completed).toBe(false);
      progress = result.progress;
    }
    const last = completeStep(quest, progress, 'solve-tree');
    if (!last.ok) throw new Error(last.error);
    expect(last.progress).toEqual({ completedSteps: ['meet-vet', 'find-letter', 'solve-tree'], completed: true });
    expect(last.reward).toEqual({ xp: 100, coin: 20, skillXp: { 'doc-hieu': 1 }, items: { 'la-than': 1 } });
  });

  it('rejects skipping ahead', () => {
    expect(completeStep(quest, emptyProgress(), 'find-letter')).toEqual({ ok: false, error: 'out-of-order' });
  });

  it('rejects repeating a finished step', () => {
    const first = completeStep(quest, emptyProgress(), 'meet-vet');
    if (!first.ok) throw new Error(first.error);
    expect(completeStep(quest, first.progress, 'meet-vet')).toEqual({ ok: false, error: 'already-completed' });
  });

  it('rejects unknown steps', () => {
    expect(completeStep(quest, emptyProgress(), 'fly-away')).toEqual({ ok: false, error: 'unknown-step' });
  });

  it('does not mutate the input progress or leak the definition reward object', () => {
    const progress = emptyProgress();
    completeStep(quest, progress, 'meet-vet');
    expect(progress.completedSteps).toEqual([]);
    const done = completeStep(quest, { completedSteps: ['meet-vet', 'find-letter'], completed: false }, 'solve-tree');
    if (!done.ok || !done.reward) throw new Error('expected reward');
    done.reward.xp = 9_999;
    expect(quest.reward.xp).toBe(100);
  });

  it('treats stored progress that does not match the quest order as out of order', () => {
    expect(completeStep(quest, { completedSteps: ['find-letter'], completed: false }, 'solve-tree')).toEqual({
      ok: false,
      error: 'out-of-order',
    });
  });
});
