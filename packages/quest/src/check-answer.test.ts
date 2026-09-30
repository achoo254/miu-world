import { describe, expect, it } from 'vitest';
import { QuestStep, type AnswerableStep } from '@miu/schema/content';
import { checkAnswer } from './check-answer';

const support = { guide: ['Làm từng bước'], hint: 'Gợi ý', answer: { text: 'Đáp án', explanation: 'Vì…' } };
const base = { id: 's', title: 'Thử thách', target: 't', skill: 'phep-cong', support };

function answerable(raw: Record<string, unknown>): AnswerableStep {
  const step = QuestStep.parse({ ...base, ...raw });
  if (!('support' in step)) throw new Error('expected a learning step');
  return step;
}

const choices = [{ id: 'a', text: '3' }, { id: 'b', text: '5' }, { id: 'c', text: '11' }];

describe('checkAnswer', () => {
  it('grades multiple choice and reading questions by choice id', () => {
    const quiz = answerable({ kind: 'challenge', mechanic: 'quiz', prompt: '8 − 3 = ?', choices, answer: { choice: 'b' } });
    expect(checkAnswer(quiz, { choice: 'b' })).toBe(true);
    expect(checkAnswer(quiz, { choice: 'a' })).toBe(false);
    const read = answerable({ kind: 'read', text: 'Lá thư', question: 'Ai viết?', choices, answer: { choice: 'c' } });
    expect(checkAnswer(read, { choice: 'c' })).toBe(true);
    expect(checkAnswer(read, { choice: 'b' })).toBe(false);
  });

  it('grades riddles by number', () => {
    const riddle = answerable({ kind: 'riddle', question: '8 + 5 = ?', answer: { value: 13 } });
    expect(checkAnswer(riddle, { value: 13 })).toBe(true);
    expect(checkAnswer(riddle, { value: 12 })).toBe(false);
  });

  it('grades sorting by exact order', () => {
    const items = [27, 15, 9, 34].map((n) => ({ id: `s${n}`, label: String(n) }));
    const sort = answerable({ kind: 'challenge', mechanic: 'sort', prompt: 'Từ bé đến lớn', items, answer: { order: ['s9', 's15', 's27', 's34'] } });
    expect(checkAnswer(sort, { order: ['s9', 's15', 's27', 's34'] })).toBe(true);
    expect(checkAnswer(sort, { order: ['s15', 's9', 's27', 's34'] })).toBe(false);
    expect(checkAnswer(sort, { order: ['s9', 's15', 's27'] })).toBe(false);
    expect(checkAnswer(sort, { order: ['s9', 's15', 's27', 's34', 's34'] })).toBe(false);
  });

  it('grades drag-drop by the total of distinct known pieces', () => {
    const pieces = Array.from({ length: 12 }, (_, i) => ({ id: `apple-${i + 1}`, label: 'Táo', value: 1 }));
    const drag = answerable({ kind: 'challenge', mechanic: 'drag-drop', prompt: 'Đủ 10 quả', container: 'Giỏ', pieces, answer: { total: 10 } });
    const ten = pieces.slice(0, 10).map((p) => p.id);
    expect(checkAnswer(drag, { placed: ten })).toBe(true);
    expect(checkAnswer(drag, { placed: pieces.slice(2, 12).map((p) => p.id) })).toBe(true);
    expect(checkAnswer(drag, { placed: ten.slice(0, 9) })).toBe(false);
    expect(checkAnswer(drag, { placed: [...ten, 'apple-11'] })).toBe(false);
    expect(checkAnswer(drag, { placed: [...ten.slice(0, 9), 'apple-1'] })).toBe(false);
    expect(checkAnswer(drag, { placed: [...ten.slice(0, 9), 'pear'] })).toBe(false);
  });

  it('grades classify and fill-blank by the whole map', () => {
    const groups = [{ id: 'g1', label: 'Sự vật' }, { id: 'g2', label: 'Hoạt động' }];
    const items = [{ id: 'sach', label: 'sách' }, { id: 'doc', label: 'đọc' }];
    const classify = answerable({ kind: 'challenge', mechanic: 'classify', prompt: 'Xếp', groups, items, answer: { assignment: { sach: 'g1', doc: 'g2' } } });
    expect(checkAnswer(classify, { assignment: { doc: 'g2', sach: 'g1' } })).toBe(true);
    expect(checkAnswer(classify, { assignment: { sach: 'g1' } })).toBe(false);
    expect(checkAnswer(classify, { assignment: { sach: 'g1', doc: 'g2', but: 'g1' } })).toBe(false);
    expect(checkAnswer(classify, { assignment: { sach: 'g2', doc: 'g2' } })).toBe(false);
    const blanks = [{ id: 'b1', options: [{ id: 'c', text: 'c' }, { id: 'k', text: 'k' }] }, { id: 'b2', options: [{ id: 'c', text: 'c' }, { id: 'k', text: 'k' }] }];
    const fill = answerable({ kind: 'challenge', mechanic: 'fill-blank', prompt: 'Điền', template: '{{b1}}á {{b2}}ẹo', blanks, answer: { fills: { b1: 'c', b2: 'k' } } });
    expect(checkAnswer(fill, { fills: { b1: 'c', b2: 'k' } })).toBe(true);
    expect(checkAnswer(fill, { fills: { b1: 'c' } })).toBe(false);
    expect(checkAnswer(fill, { fills: { b1: 'k', b2: 'c' } })).toBe(false);
  });

  it('grades multi-select as a set: any order, nothing missing, nothing extra', () => {
    const multi = answerable({ kind: 'challenge', mechanic: 'multi-select', prompt: 'Chọn', choices, answer: { choices: ['a', 'c'] } });
    expect(checkAnswer(multi, { choices: ['c', 'a'] })).toBe(true);
    expect(checkAnswer(multi, { choices: ['a'] })).toBe(false);
    expect(checkAnswer(multi, { choices: ['a', 'b', 'c'] })).toBe(false);
    expect(checkAnswer(multi, { choices: ['a', 'a'] })).toBe(false);
  });

  it('grades clocks: analog faces ignore morning/afternoon, digital ones do not', () => {
    const clock = (display: string) =>
      answerable({ kind: 'challenge', mechanic: 'clock', prompt: 'Quay kim', mode: 'set', display, answer: { hour: 15, minute: 30 } });
    expect(checkAnswer(clock('analog'), { hour: 3, minute: 30 })).toBe(true);
    expect(checkAnswer(clock('analog'), { hour: 15, minute: 30 })).toBe(true);
    expect(checkAnswer(clock('analog'), { hour: 3, minute: 0 })).toBe(false);
    expect(checkAnswer(clock('digital'), { hour: 3, minute: 30 })).toBe(false);
    expect(checkAnswer(clock('digital'), { hour: 15, minute: 30 })).toBe(true);
  });

  it('grades calendars by day or weekday, whichever the question asks', () => {
    const base = { kind: 'challenge', mechanic: 'calendar', prompt: 'Lịch', month: 11, year: 2026, question: '?' };
    const byDay = answerable({ ...base, ask: 'day', answer: { day: 20 } });
    expect(checkAnswer(byDay, { day: 20 })).toBe(true);
    expect(checkAnswer(byDay, { weekday: 'thu-sau' })).toBe(false);
    const byWeekday = answerable({ ...base, ask: 'weekday', answer: { weekday: 'thu-sau' } });
    expect(checkAnswer(byWeekday, { weekday: 'thu-sau' })).toBe(true);
    expect(checkAnswer(byWeekday, { day: 20 })).toBe(false);
  });

  it('grades connect by the set of segments, in either direction', () => {
    const points = ['a', 'b', 'c'].map((id, i) => ({ id, x: i, y: 0, label: id.toUpperCase() }));
    const connect = answerable({ kind: 'challenge', mechanic: 'connect', prompt: 'Nối', points, answer: { edges: [['a', 'b'], ['b', 'c']] } });
    expect(checkAnswer(connect, { edges: [['c', 'b'], ['b', 'a']] })).toBe(true);
    expect(checkAnswer(connect, { edges: [['a', 'b']] })).toBe(false);
    expect(checkAnswer(connect, { edges: [['a', 'b'], ['b', 'c'], ['c', 'b']] })).toBe(false);
    expect(checkAnswer(connect, { edges: [['a', 'b'], ['a', 'c']] })).toBe(false);
  });

  it('treats an answer of the wrong shape as wrong', () => {
    const riddle = answerable({ kind: 'riddle', question: '8 + 5 = ?', answer: { value: 13 } });
    expect(checkAnswer(riddle, { choice: 'a' })).toBe(false);
    const quiz = answerable({ kind: 'challenge', mechanic: 'quiz', prompt: '?', choices, answer: { choice: 'b' } });
    expect(checkAnswer(quiz, { value: 5 })).toBe(false);
  });
});
