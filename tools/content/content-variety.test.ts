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
    sevenQuestions: { who: 'Vẹt', where: 'Rừng', goal: 'Giúp', play: 'Tìm', learn: 'Cộng', reward: 'XP', unlock: 'Tiếp' },
    phases: { hook: 'hi', explore: 'find', learn: 'find', challenge: 'add', decision: 'add', finale: 'add', reward: 'add', unlock: 'add' },
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
        steps,
        phases: { hook: first?.id, explore: first?.id, learn: first?.id, challenge: second?.id, decision: second?.id, finale: second?.id, reward: second?.id, unlock: second?.id },
      });
    };
    const a = textbook('toan2-cd1-b01', 'buổi sáng', 'sort-first');
    expect(varietyIssues([a, textbook('toan2-cd1-b02', 'buổi chiều', 'pick-first')], [])).toEqual([]);
    expect(varietyIssues([a, textbook('toan2-cd1-b02', 'buổi chiều', 'sort-first')], [])).toEqual([
      'quest toan2-cd1-b02 plays exactly like toan2-cd1-b01 (sort → multi-select): vary the mechanics or their order',
    ]);
  });
});
