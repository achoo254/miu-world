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

  it('treats an answer of the wrong shape as wrong', () => {
    const riddle = answerable({ kind: 'riddle', question: '8 + 5 = ?', answer: { value: 13 } });
    expect(checkAnswer(riddle, { choice: 'a' })).toBe(false);
    const quiz = answerable({ kind: 'challenge', mechanic: 'quiz', prompt: '?', choices, answer: { choice: 'b' } });
    expect(checkAnswer(quiz, { value: 5 })).toBe(false);
  });
});
