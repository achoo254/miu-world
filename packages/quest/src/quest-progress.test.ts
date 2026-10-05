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
      { id: 'ask', title: 'Nhờ', kind: 'dialogue', target: 'parrot-guide', lines: [{ speaker: 'Vẹt', text: 'Chơi nhé!' }], en: { title: 'Ask', lines: ["Let's play!"] } },
      { id: 'play', title: 'Chơi', kind: 'challenge', mechanic: 'minigame', trigger: 'auto', prompt: 'Hứng trứng', game: 'egg-catch', goal: 10, en: { title: 'Play', prompt: 'Catch eggs' } },
    ],
    reward: { xp: 20 },
    en: { title: 'Egg catch', summary: 'Catch eggs' },
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

describe('find-object and decision steps', () => {
  const branchingQuest = activeQuest({
    id: 'branch-quest',
    region: 'khu-rung-bi-mat',
    chapter: 1,
    title: 'Thử thách quyết định',
    status: 'active',
    summary: 'Tìm đồ và chọn đường',
    review: 'teacher-pending',
    sevenQuestions: { who: 'a', where: 'b', goal: 'c', play: 'd', learn: 'e', reward: 'f', next: 'g' },
    phases: { hook: 'find-hidden', explore: 'find-hidden', learn: 'find-hidden', challenge: 'decide-way', decision: 'decide-way', finale: 'finale', reward: 'finale', next: 'finale' },
    steps: [
      {
        id: 'find-hidden',
        title: 'Tìm đồ ẩn',
        kind: 'find-object',
        prompt: 'Tìm các món đồ ẩn',
        items: [
          { id: 'item-apple', name: 'Quả táo', clue: 'Quả tròn màu đỏ', target: 'apple-tree' },
          { id: 'item-key', name: 'Chìa khóa', clue: 'Vật bằng vàng', target: 'golden-box' },
        ],
      },
      {
        id: 'decide-way',
        title: 'Chọn đường',
        kind: 'decision',
        trigger: 'auto',
        prompt: 'Bạn chọn đi đường nào?',
        choices: [
          { id: 'bridge', text: 'Đi qua cầu', consequence: 'Cầu gỗ kêu cọt kẹt nhưng bạn qua an toàn.' },
          { id: 'shortcut', text: 'Đi đường tắt', consequence: 'Đường tắt giúp bạn tới thẳng đích!', nextStepId: 'finale' },
        ],
      },
      {
        id: 'bridge-event',
        title: 'Qua cầu',
        kind: 'dialogue',
        target: 'bridge-npc',
        lines: [{ speaker: 'Vẹt', text: 'Bạn đã qua cầu an toàn!' }],
      },
      {
        id: 'finale',
        title: 'Đích đến',
        kind: 'dialogue',
        target: 'ancient-tree',
        lines: [{ speaker: 'Cây', text: 'Chúc mừng bạn!' }],
      },
    ],
    reward: { xp: 50 },
  });

  it('completes find-object only when all items are found', () => {
    const p = emptyProgress();
    expect(completeStep(branchingQuest, p, 'find-hidden')).toEqual({ ok: false, error: 'target-required' });
    expect(completeStep(branchingQuest, p, 'find-hidden', { target: 'wrong' })).toEqual({ ok: false, error: 'unknown-target' });
    const step1 = completeStep(branchingQuest, p, 'find-hidden', { target: 'apple-tree' });
    expect(step1.ok).toBe(true);
    if (!step1.ok) throw new Error();
    expect(step1.progress.completedSteps).toEqual([]);
    expect(step1.progress.found['find-hidden']).toEqual(['apple-tree']);

    const step2 = completeStep(branchingQuest, step1.progress, 'find-hidden', { target: 'golden-box' });
    expect(step2.ok).toBe(true);
    if (!step2.ok) throw new Error();
    expect(step2.progress.completedSteps).toEqual(['find-hidden']);
  });

  it('completes decision step and skips intervening steps if nextStepId is provided', () => {
    const afterFind: QuestProgress = { completedSteps: ['find-hidden'], completed: false, found: { 'find-hidden': ['apple-tree', 'golden-box'] } };
    expect(completeStep(branchingQuest, afterFind, 'decide-way')).toEqual({ ok: false, error: 'answer-required' });
    expect(completeStep(branchingQuest, afterFind, 'decide-way', { answer: { choice: 'unknown' } })).toEqual({ ok: false, error: 'wrong-answer' });

    // Normal sequential choice
    const normal = completeStep(branchingQuest, afterFind, 'decide-way', { answer: { choice: 'bridge' } });
    expect(normal.ok).toBe(true);
    if (!normal.ok) throw new Error();
    expect(normal.progress.completedSteps).toEqual(['find-hidden', 'decide-way']);
    expect(nextStep(branchingQuest, normal.progress)?.id).toBe('bridge-event');

    // Branching choice with nextStepId: skips bridge-event
    const shortcut = completeStep(branchingQuest, afterFind, 'decide-way', { answer: { choice: 'shortcut' } });
    expect(shortcut.ok).toBe(true);
    if (!shortcut.ok) throw new Error();
    expect(shortcut.progress.completedSteps).toEqual(['find-hidden', 'decide-way', 'bridge-event']);
    expect(nextStep(branchingQuest, shortcut.progress)?.id).toBe('finale');
  });
});

describe('a boss battle step', () => {
  const bossQuest = activeQuest({
    id: 'boss-forest',
    region: 'khu-rung-bi-mat',
    chapter: 1,
    title: 'Trùm Vui Rừng Xanh',
    status: 'active',
    category: 'main',
    summary: 'Đối đầu Trùm Vui',
    review: 'teacher-pending',
    sevenQuestions: { who: 'a', where: 'b', goal: 'c', play: 'd', learn: 'e', reward: 'f', next: 'g' },
    phases: { hook: 'scout', explore: 'scout', learn: 'boss-1', challenge: 'boss-1', decision: 'boss-1', finale: 'boss-1', reward: 'boss-1', next: 'boss-1' },
    steps: [
      // Every quest needs two mechanics besides multiple choice: a search before the battle.
      { id: 'scout', title: 'Dò đường', kind: 'search', targets: ['stump'] },
      {
        id: 'boss-1',
        title: 'Thử thách Trùm',
        kind: 'boss',
        trigger: 'auto',
        bossId: 'golem-wood',
        bossName: 'Người Gỗ Vui Vẻ',
        introDialogue: 'Hãy trả lời câu hỏi của ta!',
        winDialogue: 'Bé thông minh quá, ta chịu thua!',
        maxHp: 160,
        damagePerTurn: 80,
        turns: [
          {
            id: 'turn-1',
            prompt: '1 + 1 = ?',
            skill: 'toan',
            choices: [
              { id: 'c1', text: '2' },
              { id: 'c2', text: '3' },
            ],
            damage: 80,
            answer: { choice: 'c1' },
          },
          {
            id: 'turn-2',
            prompt: '2 + 2 = ?',
            skill: 'toan',
            choices: [
              { id: 'c3', text: '4' },
              { id: 'c4', text: '5' },
            ],
            damage: 80,
            answer: { choice: 'c3' },
          },
        ],
      },
    ],
    reward: { xp: 100 },
  });

  it('reduces HP on right turn answers and completes when HP hits 0', () => {
    const scouted = completeStep(bossQuest, emptyProgress(), 'scout', { target: 'stump' });
    if (!scouted.ok) throw new Error('the search step should complete');
    const p = scouted.progress;
    expect(completeStep(bossQuest, p, 'boss-1')).toEqual({ ok: false, error: 'answer-required' });
    expect(completeStep(bossQuest, p, 'boss-1', { answer: { turnId: 'turn-1', choice: 'c2' } })).toEqual({
      ok: false,
      error: 'wrong-answer',
    });

    // Turn 1 right: 80 damage dealt, 80 HP left -> not finished yet
    const turn1 = completeStep(bossQuest, p, 'boss-1', { answer: { turnId: 'turn-1', choice: 'c1' } });
    expect(turn1.ok).toBe(true);
    if (!turn1.ok) throw new Error();
    expect(turn1.progress.completedSteps).toEqual(['scout']);
    expect(turn1.progress.found['boss-1']).toEqual(['turn-1']);
    expect(turn1.reward).toBeNull();
    // The same blow sent again (a lost connection's retry) lands nothing more.
    expect(completeStep(bossQuest, turn1.progress, 'boss-1', { answer: { turnId: 'turn-1', choice: 'c1' } })).toEqual({ ok: false, error: 'already-completed' });

    // Turn 2 right: 80 damage dealt, remaining HP = 0 -> boss defeated, quest finishes!
    const turn2 = completeStep(bossQuest, turn1.progress, 'boss-1', { answer: { turnId: 'turn-2', choice: 'c3' } });
    expect(turn2.ok).toBe(true);
    if (!turn2.ok) throw new Error();
    expect(turn2.progress.completedSteps).toEqual(['scout', 'boss-1']);
    expect(turn2.progress.completed).toBe(true);
    expect(turn2.reward).toMatchObject({ xp: 100 });
  });
});
