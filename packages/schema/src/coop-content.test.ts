import { describe, expect, it } from 'vitest';
import { QuestDefinition, QuestStepPublic } from './content';
import { ClientWsMessage, ServerWsMessage } from './multiplayer';

const task = (id: string, damage?: number) => ({
  id,
  prompt: `Câu ${id}?`,
  skill: 'cong-tru',
  choices: [
    { id: 'a', text: 'Đúng' },
    { id: 'b', text: 'Sai' },
  ],
  answer: { choice: 'a' },
  hint: 'Gợi ý',
  explain: 'Vì thế',
  ...(damage ? { damage } : {}),
  en: { prompt: `Question ${id}?`, choices: ['Right', 'Wrong'], hint: 'Hint', explain: 'Because' },
});

const feedback = { right: ['Đúng 1', 'Đúng 2', 'Đúng 3'], wrong: ['Sai 1', 'Sai 2', 'Sai 3'], en: { right: ['R1', 'R2', 'R3'], wrong: ['W1', 'W2', 'W3'] } };
const coopStep = {
  id: 'cung-choi',
  title: 'Cùng chơi',
  kind: 'coop',
  trigger: 'auto',
  mode: 'team-boss',
  prompt: 'Cả đội đánh trùm.',
  guide: ['Mỗi bạn một đòn.'],
  feedback,
  boss: { name: 'Trùm', maxHp: 200, intro: 'Tới đây!', win: 'Thua rồi!', en: { name: 'Boss', intro: 'Here!', win: 'Beaten!' } },
  turns: [task('t1', 100), task('t2', 100)],
  en: { title: 'Play together', prompt: 'Beat the boss.', guide: ['One blow each.'] },
};

function quest(overrides: Record<string, unknown> = {}, step: Record<string, unknown> = coopStep) {
  return {
    id: 'with-thu',
    region: 'khu-rung-bi-mat',
    chapter: 1,
    title: 'Thử',
    summary: 'Thử',
    category: 'coop',
    status: 'active',
    review: 'teacher-pending',
    sevenQuestions: { who: 'a', where: 'b', goal: 'c', play: 'd', learn: 'e', reward: 'f', next: 'g' },
    phases: { hook: 'gap', explore: 'gap', learn: 'gap', challenge: 'cung-choi', decision: 'cung-choi', finale: 'thuong', reward: 'thuong', next: 'tiep' },
    steps: [
      { id: 'gap', title: 'Gặp', kind: 'dialogue', target: 'chu-tro', lines: [{ speaker: 'Chủ', text: 'Chơi nhé!' }], en: { title: 'Meet', lines: ['Play!'] } },
      step,
      { id: 'thuong', title: 'Thưởng', kind: 'reward', trigger: 'auto', text: 'Thưởng.', en: { title: 'Reward', text: 'Reward.' } },
      { id: 'tiep', title: 'Tiếp', kind: 'next', trigger: 'auto', text: 'Tiếp.', en: { title: 'Next', text: 'Next.' } },
    ],
    reward: { xp: 10, coin: 5 },
    en: { title: 'Try', summary: 'Try' },
    ...overrides,
  };
}

const issues = (q: unknown): string[] => {
  const parsed = QuestDefinition.safeParse(q);
  return parsed.success ? [] : parsed.error.issues.map((i) => i.message);
};

describe('co-op challenges as content', () => {
  it('accepts a well-made challenge, and the client view keeps none of its questions', () => {
    expect(issues(quest())).toEqual([]);
    const view = QuestStepPublic.parse(coopStep);
    expect(view).toMatchObject({ kind: 'coop', mode: 'team-boss', seats: 3 });
    expect(JSON.stringify(view)).not.toContain('Câu t1');
  });

  it('keeps the rules: its prefix, one co-op step, steps that run by themselves, answers among the choices, enough HP', () => {
    expect(issues(quest({ id: 'thu-coop' }))).toContain('a co-op challenge id starts with "with-"');
    expect(issues(quest({ category: 'main' }))).toContain('a quest whose id starts with "with-" is a co-op challenge ("category": "coop")');
    expect(issues(quest({}, { ...coopStep, trigger: 'interact', target: 'chu-tro' }))).toContain('step cung-choi: after the host\'s dialogue, co-op challenge steps run by themselves (trigger "auto")');
    expect(issues(quest({}, { ...coopStep, turns: [task('t1', 50), task('t2', 50)] }))).toContain('step cung-choi: the blows take 100 HP in all, less than the boss\'s 200');
    expect(issues(quest({}, { ...coopStep, turns: [{ ...task('t1', 100), answer: { choice: 'z' } }, task('t2', 100)] }))).toContain('step cung-choi: question t1: answer is not one of the choices');
    expect(issues(quest({}, { ...coopStep, turns: [{ ...task('t1', 100), en: undefined }, task('t2', 100)] }))).toContain('step cung-choi: question t1 needs its English twin ("en")');
    expect(issues(quest({}, { ...coopStep, mode: 'together', rounds: [{ id: 'r1', title: 'Kéo', tasks: [task('t1', 100)], en: { title: 'Pull' } }] }))).toContain('step cung-choi: question t1: only a boss blow has damage');
  });

  it('carries co-op messages on the wire, closed: no reward a client could send', () => {
    expect(ClientWsMessage.safeParse({ type: 'coop-act', action: { kind: 'answer', task: 't1', choice: 'a' } }).success).toBe(true);
    expect(ClientWsMessage.safeParse({ type: 'coop-act', action: { kind: 'answer', task: 't1', choice: 'a', reward: 99 } }).success).toBe(false);
    expect(ClientWsMessage.safeParse({ type: 'coop-act', action: { kind: 'win' } }).success).toBe(false);
    expect(ServerWsMessage.safeParse({ type: 'coop-lobby', lobby: null }).success).toBe(true);
  });
});
