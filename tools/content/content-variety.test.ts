import { describe, expect, it } from 'vitest';
import { QuestDefinition } from '../../packages/schema/src/content';
import { varietyIssues } from './content-variety';

const support = (tag: string) => ({ guide: [`Hướng dẫn riêng của ${tag}`], hint: `Gợi ý riêng cho ${tag}`, answer: { text: '2', explanation: `Giải thích riêng của ${tag}` } });

/** A quest whose every line carries its own tag, so two quests never share a line unless a test says so. */
function quest(id: string, tag: string, extra: Record<string, unknown> = {}) {
  return QuestDefinition.parse({
    id,
    region: 'khu-rung-bi-mat',
    chapter: 1,
    title: `Chuyến đi ${tag}`,
    status: 'active',
    summary: `Câu chuyện riêng của ${tag}`,
    review: 'teacher-pending',
    sevenQuestions: { who: 'Vẹt', where: 'Rừng', goal: 'Giúp', play: 'Tìm', learn: 'Cộng', reward: 'XP', next: 'Tiếp' },
    phases: { hook: 'hi', explore: 'find', learn: 'find', challenge: 'add', decision: 'add', finale: 'add', reward: 'add', next: 'add' },
    steps: [
      { id: 'hi', title: 'Chào', kind: 'dialogue', trigger: 'auto', lines: [{ speaker: 'Vẹt', text: `Xin chào, hôm nay ${tag} thật vui!` }] },
      { id: 'find', title: 'Tìm', kind: 'search', targets: ['box'] },
      { id: 'add', title: 'Đố', kind: 'riddle', trigger: 'auto', question: `Câu đố số học của ${tag}`, skill: 'phep-cong', answer: { value: 2 }, support: support(tag) },
    ],
    reward: { xp: 10 },
    ...extra,
  });
}

describe('varietyIssues', () => {
  it('accepts quests that each speak with their own lines', () => {
    expect(varietyIssues([quest('a', 'buổi sáng'), quest('b', 'buổi chiều')], [])).toEqual([]);
  });

  it('flags a line reused in another quest, support text included', () => {
    const copy = quest('b', 'buổi chiều');
    if (copy.status !== 'active') throw new Error('active');
    const riddle = copy.steps[2];
    if (riddle?.kind !== 'riddle') throw new Error('riddle');
    riddle.support.answer.explanation = 'Giải thích riêng của buổi sáng';
    expect(varietyIssues([quest('a', 'buổi sáng'), copy], [])).toEqual([
      'quest b steps[2].support.answer.explanation repeats "Giải thích riêng của buổi sáng" (already used by quest a steps[2].support.answer.explanation): write a new line',
    ]);
  });

  it("lets a boss question's answer layer name its right choice, but not reuse another line", () => {
    const label = (n: number) => `Các bạn nhỏ chơi rồng rắn lên mây ${n}`;
    const bossOf = (tag: string, explanation: string) => ({
      id: 'trum',
      title: 'Đấu trí',
      kind: 'boss',
      trigger: 'auto',
      bossId: 'than-rung',
      bossName: 'Thần Rừng',
      introDialogue: `Ta thách đố ${tag} đây`,
      winDialogue: `Ta chịu thua ${tag} rồi`,
      maxHp: 160,
      damagePerTurn: 80,
      turns: [1, 2].map((n) => ({
        id: `q${n}`,
        prompt: `Câu đố thứ ${n} của ${tag}`,
        skill: 'cau',
        move: n === 1 ? 'gem' : 'charge',
        choices: [{ id: 'a', text: label(n) }, { id: 'b', text: `Khu rừng ${tag} rất yên tĩnh ${n}` }],
        answer: { choice: 'a' },
        support: {
          guide: [`Đọc từng câu của ${tag}, lượt ${n}`],
          hint: `Tìm câu có việc đang làm, ${tag} ${n}`,
          answer: { text: label(n), explanation: n === 1 ? explanation : `Giải thích lượt hai của ${tag}` },
          en: { guide: [`Read each sentence of ${tag}, turn ${n}`], hint: `Look for something being done, ${tag} ${n}`, answer: { text: `Children play a game ${tag} ${n}`, explanation: `Explained for ${tag}, turn ${n}` } },
        },
      })),
    });
    const withBoss = (id: string, tag: string, explanation: string) => {
      const q = quest(id, tag);
      if (q.status !== 'active') throw new Error('active');
      return QuestDefinition.parse({ ...q, steps: [...q.steps, bossOf(tag, explanation)] });
    };
    expect(varietyIssues([withBoss('a', 'buổi sáng', 'Giải thích lượt một của buổi sáng')], [])).toEqual([]);
    expect(varietyIssues([withBoss('a', 'buổi sáng', 'Giải thích riêng của buổi sáng')], [])).toEqual([
      'quest a steps[3].turns[0].support.answer.explanation repeats "Giải thích riêng của buổi sáng" (already used by quest a steps[2].support.answer.explanation): write a new line',
    ]);
  });

  it('ignores short labels and graded answers', () => {
    const a = quest('a', 'buổi sáng', { title: 'Đọc bài' });
    const b = quest('b', 'buổi chiều', { title: 'Đọc bài' });
    expect(varietyIssues([a, b], [])).toEqual([]);
  });

  it('flags two textbook quests that play the same sequence of mechanics', () => {
    const textbook = (id: string, tag: string, order: 'sort-first' | 'pick-first') => {
      const fb = (n: string) => ({ right: [1, 2, 3].map((i) => `${tag} ${n} khen ${i}`), wrong: [1, 2, 3].map((i) => `${tag} ${n} nhắc ${i}`) });
      const sort = { id: 'sort', title: 'Xếp', kind: 'challenge', mechanic: 'sort', trigger: 'auto', prompt: `Xếp các số của ${tag}`, skill: 'phep-cong', items: [{ id: 'b', label: '9' }, { id: 'a', label: '3' }], answer: { order: ['a', 'b'] }, support: support(`${tag} xếp`), feedback: fb('xếp') };
      const pick = { id: 'pick', title: 'Chọn', kind: 'challenge', mechanic: 'multi-select', trigger: 'auto', prompt: `Chọn số chẵn của ${tag}`, skill: 'phep-cong', choices: [{ id: 'c', text: '2' }, { id: 'd', text: '3' }], answer: { choices: ['c'] }, support: support(`${tag} chọn`), feedback: fb('chọn') };
      const steps = order === 'sort-first' ? [sort, pick] : [pick, sort];
      const [first, second] = steps;
      return quest(id, tag, {
        status: 'draft',
        lesson: 'toan2-t1-b01',
        steps,
        phases: { hook: first?.id, explore: first?.id, learn: first?.id, challenge: second?.id, decision: second?.id, finale: second?.id, reward: second?.id, next: second?.id },
      });
    };
    const a = textbook('toan2-cd1-b01', 'buổi sáng', 'sort-first');
    expect(varietyIssues([a, textbook('toan2-cd1-b02', 'buổi chiều', 'pick-first')], [])).toEqual([]);
    expect(varietyIssues([a, textbook('toan2-cd1-b02', 'buổi chiều', 'sort-first')], [])).toEqual([
      'quest toan2-cd1-b02 plays exactly like toan2-cd1-b01 (sort → multi-select): vary the mechanics or their order',
    ]);
  });
});
