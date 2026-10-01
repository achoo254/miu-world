import { describe, expect, it } from 'vitest';
import { QuestStepPublic } from '@miu/schema/content';
import type { QuestProgressDto } from '@miu/schema/game';
import { autoStep, currentStep, hintTarget, searchCount, stepForTarget, worldState, type ActiveQuestView } from './quest-flow';

const steps = [
  { id: 'meet-parrot', title: 'Gặp Vẹt', kind: 'dialogue', target: 'parrot-guide', lines: [{ speaker: 'Vẹt', text: 'Chào {name}!' }] },
  { id: 'find-clues', title: 'Tìm manh mối', kind: 'search', targets: ['clue-box', 'clue-letter'] },
  {
    id: 'read-letter',
    title: 'Đọc thư',
    kind: 'read',
    target: 'clue-letter',
    trigger: 'auto',
    skill: 'doc-hieu',
    text: 'Thư',
    question: 'Ai?',
    choices: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ],
  },
  { id: 'open-chest', title: 'Mở rương', kind: 'reward', target: 'chest', text: 'Rương mở' },
  { id: 'open-gate', title: 'Mở cổng', kind: 'next', target: 'gate-ch2', trigger: 'auto', text: 'Cổng mở' },
].map((s) => QuestStepPublic.parse(s));
const quest = {
  id: 'q',
  region: 'r',
  chapter: 1,
  title: 'Q',
  status: 'active',
  summary: 's',
  texts: {},
  steps,
  reward: { xp: 100, coin: 0, skillXp: {}, items: {} },
} as ActiveQuestView;
const progress = (completedSteps: string[], found: Record<string, string[]> = {}): QuestProgressDto => ({
  questId: 'q',
  completedSteps,
  completed: false,
  found,
  stars: null,
});

describe('quest flow', () => {
  it('matches a touched target only to the step waiting for it', () => {
    expect(stepForTarget(quest, progress([]), 'parrot-guide')?.id).toBe('meet-parrot');
    expect(stepForTarget(quest, progress([]), 'clue-box')).toBeNull(); // not yet: talk to the parrot first
    expect(stepForTarget(quest, progress(['meet-parrot']), 'clue-box')?.id).toBe('find-clues');
    expect(stepForTarget(quest, progress(['meet-parrot'], { 'find-clues': ['clue-box'] }), 'clue-box')).toBeNull(); // already found
    expect(stepForTarget(quest, progress(['meet-parrot', 'find-clues']), 'clue-letter')).toBeNull(); // auto step, not by touch
  });

  it('starts auto steps by themselves', () => {
    expect(autoStep(quest, progress(['meet-parrot']))).toBeNull();
    expect(autoStep(quest, progress(['meet-parrot', 'find-clues']))?.id).toBe('read-letter');
    expect(autoStep(quest, progress(['meet-parrot', 'find-clues', 'read-letter', 'open-chest']))?.id).toBe('open-gate');
  });

  it('points the arrow at the current target, or the next clue still to find', () => {
    expect(hintTarget(quest, progress([]))).toBe('parrot-guide');
    expect(hintTarget(quest, progress(['meet-parrot'], { 'find-clues': ['clue-box'] }))).toBe('clue-letter');
    expect(hintTarget(quest, progress(['meet-parrot', 'find-clues']))).toBeNull();
    expect(hintTarget(quest, progress(['meet-parrot', 'find-clues', 'read-letter']))).toBe('chest');
  });

  it('turns progress into the world look, and counts clues from the server list', () => {
    expect(worldState(quest, progress(['meet-parrot'], { 'find-clues': ['clue-box'] }))).toEqual({ 'clue-box': 'found' });
    const nearlyDone = progress(['meet-parrot', 'find-clues', 'read-letter', 'open-chest'], { 'find-clues': ['clue-box', 'clue-letter'] });
    expect(worldState(quest, nearlyDone)).toEqual({ 'clue-box': 'found', 'clue-letter': 'found', chest: 'open' });
    const search = steps[1];
    if (!search) throw new Error('missing step');
    expect(searchCount(search, progress(['meet-parrot'], { 'find-clues': ['clue-letter'] }))).toEqual({ found: 1, total: 2 });
    expect(currentStep(quest, progress(steps.map((s) => s.id)))).toBeNull();
  });
});
