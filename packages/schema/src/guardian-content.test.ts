import { describe, expect, it } from 'vitest';
import { QuestDefinition, QuestStepPublic } from './content';

const turn = (id: string, damage = 100) => ({
  id,
  prompt: `Câu đố ${id} của trùm?`,
  skill: 'cong-tru',
  choices: [
    { id: 'a', text: 'Đúng' },
    { id: 'b', text: 'Sai' },
  ],
  answer: { choice: 'a' },
  damage,
  en: { prompt: `Riddle ${id}?`, choices: ['Right', 'Wrong'] },
});

const feedback = { right: ['Trúng rồi!', 'Hay lắm!', 'Giỏi ghê!'], wrong: ['Hụt rồi!', 'Thử lại!', 'Gần đúng!'], en: { right: ['A hit!', 'Nice!', 'Great!'], wrong: ['Missed!', 'Again!', 'So close!'] } };
const bossStep = {
  id: 'dau-trum',
  title: 'Đấu trùm canh khu',
  kind: 'boss',
  trigger: 'auto',
  target: 'trum-canh-thu',
  bossId: 'trum-canh-thu',
  bossName: 'Trùm Canh Thử',
  introDialogue: 'Ta canh khu này!',
  winDialogue: 'Ta chịu thua!',
  maxHp: 400,
  damagePerTurn: 100,
  turns: [turn('t1'), turn('t2'), turn('t3'), turn('t4')],
  feedback,
  en: { title: 'Fight the zone guardian', bossName: 'Test Guardian', introDialogue: 'I guard this zone!', winDialogue: 'You win!' },
};

function quest(overrides: Record<string, unknown> = {}, step: Record<string, unknown> = bossStep) {
  return {
    id: 'ward-thu-mot',
    region: 'khu-rung-bi-mat',
    chapter: 1,
    title: 'Trùm canh: Thử',
    summary: 'Đấu với trùm canh khu.',
    category: 'guardian',
    status: 'active',
    review: 'teacher-pending',
    sevenQuestions: { who: 'a', where: 'b', goal: 'c', play: 'd', learn: 'e', reward: 'f', next: 'g' },
    phases: { hook: 'gap', explore: 'gap', learn: 'gap', challenge: 'dau-trum', decision: 'dau-trum', finale: 'dau-trum', reward: 'thuong', next: 'tiep' },
    steps: [
      { id: 'gap', title: 'Gặp trùm', kind: 'dialogue', target: 'trum-canh-thu', lines: [{ speaker: 'Trùm Canh Thử', text: 'Đấu không?' }], en: { title: 'Meet the guardian', lines: ['Fight?'] } },
      step,
      { id: 'thuong', title: 'Thưởng', kind: 'reward', trigger: 'auto', text: 'Phần thưởng.', en: { title: 'Reward', text: 'Reward.' } },
      { id: 'tiep', title: 'Tiếp', kind: 'next', trigger: 'auto', text: 'Đi tiếp.', en: { title: 'Next', text: 'Onward.' } },
    ],
    reward: { xp: 30, coin: 10 },
    en: { title: 'Guardian: Test', summary: 'Fight the zone guardian.' },
    ...overrides,
  };
}

const issues = (q: unknown): string[] => {
  const parsed = QuestDefinition.safeParse(q);
  return parsed.success ? [] : parsed.error.issues.map((i) => i.message);
};

describe('zone guardians as content', () => {
  it('accepts a well-made guardian; the client sees its English twins but neither answers nor its lines', () => {
    expect(issues(quest())).toEqual([]);
    const view = QuestStepPublic.parse(bossStep);
    expect(view).toMatchObject({ kind: 'boss', en: { bossName: 'Test Guardian' } });
    expect(view.kind === 'boss' && view.turns[0]?.en).toEqual({ prompt: 'Riddle t1?', choices: ['Right', 'Wrong'] });
    expect(JSON.stringify(view)).not.toContain('"answer"');
    expect(JSON.stringify(view)).not.toContain('Hụt rồi!');
  });

  it('keeps its prefix and its category together', () => {
    expect(issues(quest({ id: 'thu-trum' }))).toContain('a zone guardian id starts with "ward-"');
    expect(issues(quest({ category: 'main' }))).toContain('a quest whose id starts with "ward-" is a zone guardian ("category": "guardian")');
  });

  it('asks four or five questions, every one of them needed to win', () => {
    expect(issues(quest({}, { ...bossStep, turns: [turn('t1'), turn('t2'), turn('t3')], maxHp: 300 }))).toContain('step dau-trum: a zone guardian asks 4–5 questions, not 3');
    expect(issues(quest({}, { ...bossStep, turns: [turn('t1'), turn('t2'), turn('t3'), turn('t4'), turn('t5'), turn('t6')], maxHp: 600 }))).toContain('step dau-trum: a zone guardian asks 4–5 questions, not 6');
    expect(issues(quest({}, { ...bossStep, maxHp: 300 }))).toContain('step dau-trum: the guardian falls before its last question (lower the damage or raise maxHp)');
    expect(issues(quest({}, { ...bossStep, maxHp: 500 }))).toContain('step dau-trum: the turns take 400 HP in all, less than the boss\'s 500');
  });

  it('is the guardian the dialogue opens at, answers every blow and miss, and runs on by itself', () => {
    expect(issues(quest({}, { ...bossStep, target: 'ai-khac' }))).toContain('step dau-trum: the guardian (trum-canh-thu) is the boss');
    expect(issues(quest({}, { ...bossStep, feedback: undefined }))).toContain('step dau-trum: the guardian answers every blow and every miss (feedback lines)');
    expect(issues(quest({}, { ...bossStep, trigger: 'interact' }))).toContain('step dau-trum: after the guardian\'s dialogue, the fight and its closing beats run by themselves (trigger "auto")');
  });

  it('ships in both languages, every question included', () => {
    expect(issues(quest({}, { ...bossStep, turns: [turn('t1'), turn('t2'), turn('t3'), { ...turn('t4'), en: undefined }] }))).toContain('step dau-trum: turn t4 needs its English twin ("en")');
    expect(issues(quest({}, { ...bossStep, turns: [turn('t1'), turn('t2'), turn('t3'), { ...turn('t4'), en: { prompt: 'Q?', choices: ['Only one', 'Two', 'Three'] } }] }))).toContain('step dau-trum: turn t4: en has 3 choices, the turn 2');
    expect(issues(quest({}, { ...bossStep, feedback: { right: feedback.right, wrong: feedback.wrong } }))).toContain('step dau-trum: needs its feedback lines in English (feedback.en)');
    expect(issues(quest({ en: undefined }))).toContain('needs its title and summary in English ("en")');
  });

  it('says a feedback line once in the quest', () => {
    expect(issues(quest({}, { ...bossStep, feedback: { ...feedback, wrong: ['Trúng rồi!', 'Thử lại!', 'Gần đúng!'] } }))).toContain('feedback line "Trúng rồi!" is used twice in the quest');
  });
});
