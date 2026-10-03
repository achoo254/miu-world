import { describe, expect, it } from 'vitest';
import { QuestDefinition, type ActiveQuest } from '@miu/schema/content';
import { completeStep, emptyProgress, nextStep, type QuestProgress } from './quest-progress';

const support = { guide: ['Đếm thêm 5 từ 8'], hint: 'Bắt đầu từ 8', answer: { text: '13', explanation: '8 + 5 = 13' } };

function activeQuest(raw: unknown): ActiveQuest {
  const quest = QuestDefinition.parse(raw);
  if (quest.status !== 'active') throw new Error('expected an active quest');
  return quest;
}

const quest = activeQuest({
  id: 'forest-ch1',
  region: 'khu-rung-bi-mat',
  chapter: 1,
  title: 'Khu rừng bí mật',
  status: 'active',
  summary: 'Tìm lá thần',
  review: 'teacher-pending',
  sevenQuestions: { who: 'Miu', where: 'Rừng', goal: 'Chữa cây', play: 'Tìm, đố', learn: 'Phép cộng', reward: 'Lá thần', next: 'Chương 2' },
  phases: { hook: 'meet-vet', explore: 'find-clues', learn: 'find-clues', challenge: 'solve-tree', decision: 'solve-tree', finale: 'solve-tree', reward: 'solve-tree', next: 'solve-tree' },
  steps: [
    { id: 'meet-vet', title: 'Gặp Vẹt', kind: 'dialogue', target: 'parrot-guide', lines: [{ speaker: 'Vẹt', text: 'Chào Miu!' }] },
    { id: 'find-clues', title: 'Tìm manh mối', kind: 'search', targets: ['box', 'letter', 'mushroom'] },
    { id: 'solve-tree', title: 'Giải đố', kind: 'riddle', target: 'ancient-tree', question: '8 + 5 = ?', skill: 'phep-cong', answer: { value: 13 }, support },
  ],
  reward: { xp: 100, coin: 20, skillXp: { 'doc-hieu': 1 }, items: { 'la-than': 1 } },
});

function advance(progress: QuestProgress, stepId: string, input = {}): QuestProgress {
  const result = completeStep(quest, progress, stepId, input);
  if (!result.ok) throw new Error(result.error);
  return result.progress;
}

describe('completeStep', () => {
  it('advances linearly and pays the reward only on the last step', () => {
    let progress = advance(emptyProgress(), 'meet-vet');
    for (const target of ['box', 'letter', 'mushroom']) progress = advance(progress, 'find-clues', { target });
    expect(progress.completed).toBe(false);
    const last = completeStep(quest, progress, 'solve-tree', { answer: { value: 13 } });
    if (!last.ok) throw new Error(last.error);
    expect(last.progress).toEqual({
      completedSteps: ['meet-vet', 'find-clues', 'solve-tree'],
      completed: true,
      found: { 'find-clues': ['box', 'letter', 'mushroom'] },
    });
    expect(last.reward).toEqual({ xp: 100, coin: 20, skillXp: { 'doc-hieu': 1 }, items: { 'la-than': 1 } });
  });

  it('finds search targets in any order; finding one again changes nothing', () => {
    let progress = advance(emptyProgress(), 'meet-vet');
    progress = advance(progress, 'find-clues', { target: 'mushroom' });
    progress = advance(progress, 'find-clues', { target: 'mushroom' });
    expect(progress).toEqual({ completedSteps: ['meet-vet'], completed: false, found: { 'find-clues': ['mushroom'] } });
    progress = advance(progress, 'find-clues', { target: 'letter' });
    progress = advance(progress, 'find-clues', { target: 'box' });
    expect(progress.completedSteps).toEqual(['meet-vet', 'find-clues']);
    expect(completeStep(quest, progress, 'find-clues', { target: 'box' })).toEqual({ ok: false, error: 'already-completed' });
  });

  it('needs a known target for search steps', () => {
    const progress = advance(emptyProgress(), 'meet-vet');
    expect(completeStep(quest, progress, 'find-clues')).toEqual({ ok: false, error: 'target-required' });
    expect(completeStep(quest, progress, 'find-clues', { target: 'dragon' })).toEqual({ ok: false, error: 'unknown-target' });
  });

  it('completes a learning step only with the right answer', () => {
    const progress: QuestProgress = { completedSteps: ['meet-vet', 'find-clues'], completed: false, found: {} };
    expect(completeStep(quest, progress, 'solve-tree')).toEqual({ ok: false, error: 'answer-required' });
    expect(completeStep(quest, progress, 'solve-tree', { answer: { value: 12 } })).toEqual({ ok: false, error: 'wrong-answer' });
    expect(completeStep(quest, progress, 'solve-tree', { answer: { choice: 'a' } })).toEqual({ ok: false, error: 'wrong-answer' });
    expect(completeStep(quest, progress, 'solve-tree', { answer: { value: 13 } }).ok).toBe(true);
  });

  it('rejects skipping ahead, repeats and unknown steps', () => {
    expect(completeStep(quest, emptyProgress(), 'find-clues', { target: 'box' })).toEqual({ ok: false, error: 'out-of-order' });
    const first = advance(emptyProgress(), 'meet-vet');
    expect(completeStep(quest, first, 'meet-vet')).toEqual({ ok: false, error: 'already-completed' });
    expect(completeStep(quest, emptyProgress(), 'fly-away')).toEqual({ ok: false, error: 'unknown-step' });
  });

  it('does not mutate the input progress or leak the definition reward object', () => {
    const progress = advance(emptyProgress(), 'meet-vet');
    advance(progress, 'find-clues', { target: 'box' });
    expect(progress).toEqual({ completedSteps: ['meet-vet'], completed: false, found: {} });
    const done = completeStep(quest, { completedSteps: ['meet-vet', 'find-clues'], completed: false, found: {} }, 'solve-tree', {
      answer: { value: 13 },
    });
    if (!done.ok || !done.reward) throw new Error('expected reward');
    done.reward.xp = 9_999;
    expect(quest.reward.xp).toBe(100);
  });

  it('treats stored progress that does not match the quest order as out of order', () => {
    expect(completeStep(quest, { completedSteps: ['find-clues'], completed: false, found: {} }, 'solve-tree', { answer: { value: 13 } })).toEqual({
      ok: false,
      error: 'out-of-order',
    });
  });
});

describe('a minigame step', () => {
  const game = activeQuest({
    id: 'side-hung-trung',
    region: 'khu-rung-bi-mat',
    chapter: 1,
    title: 'Hứng trứng',
    status: 'active',
    category: 'side',
    summary: 'Hứng trứng',
    review: 'teacher-pending',
    sevenQuestions: { who: 'a', where: 'b', goal: 'c', play: 'd', learn: 'e', reward: 'f', next: 'g' },
    phases: { hook: 'ask', explore: 'ask', learn: 'ask', challenge: 'play', decision: 'play', finale: 'play', reward: 'play', next: 'play' },
    steps: [
      { id: 'ask', title: 'Nhờ', kind: 'dialogue', target: 'parrot-guide', lines: [{ speaker: 'Vẹt', text: 'Chơi nhé!' }] },
      { id: 'play', title: 'Chơi', kind: 'challenge', mechanic: 'minigame', trigger: 'auto', prompt: 'Hứng trứng', game: 'egg-catch', goal: 10 },
    ],
    reward: { xp: 20 },
  });
  const asked = { completedSteps: ['ask'], completed: false, found: {} };

  it('completes once the score reaches the goal, and pays on the last step', () => {
    expect(completeStep(game, asked, 'play', { answer: { score: 10 } })).toMatchObject({ ok: true, progress: { completed: true }, reward: { xp: 20 } });
    expect(completeStep(game, asked, 'play', { answer: { score: 25 } })).toMatchObject({ ok: true });
  });

  it('is not won below the goal, and needs a score', () => {
    expect(completeStep(game, asked, 'play', { answer: { score: 9 } })).toEqual({ ok: false, error: 'wrong-answer' });
    expect(completeStep(game, asked, 'play', { answer: { value: 10 } })).toEqual({ ok: false, error: 'wrong-answer' });
    expect(completeStep(game, asked, 'play')).toEqual({ ok: false, error: 'answer-required' });
  });
});

describe('nextStep', () => {
  it('points at the first unfinished step, then null', () => {
    expect(nextStep(quest, emptyProgress())?.id).toBe('meet-vet');
    const searching = advance(advance(emptyProgress(), 'meet-vet'), 'find-clues', { target: 'box' });
    expect(nextStep(quest, searching)?.id).toBe('find-clues');
    expect(nextStep(quest, { completedSteps: ['meet-vet', 'find-clues', 'solve-tree'] })).toBeNull();
  });
});
