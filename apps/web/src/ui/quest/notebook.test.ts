import { afterEach, describe, expect, it } from 'vitest';
import type { QuestStepPublic } from '@miu/schema/content';
import { keepInNotebook, notebookEntry, readNotebook } from './notebook';

const base = { id: 's', title: 'T', skill: 'k' };
const fill = (t: string) => t.replace('{name}', 'Mochi');
const challenge = (rest: Record<string, unknown>) => ({ ...base, kind: 'challenge', prompt: 'Câu hỏi của {name}', ...rest }) as unknown as QuestStepPublic;

describe('notebook entry', () => {
  it('writes the question and the answer she gave, in words, for every graded mechanic', () => {
    const choices = [{ id: 'a', text: '4 + 6' }, { id: 'b', text: '5 + 4' }, { id: 'c', text: '8 + 2' }];
    expect(notebookEntry(challenge({ mechanic: 'quiz', choices }), { choice: 'a' }, fill)).toEqual({ step: 's', question: 'Câu hỏi của Mochi', answer: '4 + 6' });
    expect(notebookEntry(challenge({ mechanic: 'multi-select', choices }), { choices: ['a', 'c'] }, fill)?.answer).toBe('4 + 6, 8 + 2');
    expect(
      notebookEntry(challenge({ mechanic: 'fill-blank', template: '47 {{b1}} 38', blanks: [{ id: 'b1', options: [{ id: 'gt', text: '>' }, { id: 'lt', text: '<' }] }] }), { fills: { b1: 'gt' } }, fill),
    ).toEqual({ step: 's', question: 'Câu hỏi của Mochi\n47 … 38', answer: '47 > 38' });
    expect(
      notebookEntry(
        challenge({ mechanic: 'classify', groups: [{ id: 'sv', label: 'Chỉ sự vật' }, { id: 'hd', label: 'Chỉ hoạt động' }], items: [{ id: 'sach', label: 'sách' }, { id: 'doc', label: 'đọc' }, { id: 'but', label: 'bút' }] }),
        { assignment: { sach: 'sv', doc: 'hd', but: 'sv' } },
        fill,
      )?.answer,
    ).toBe('Chỉ sự vật: sách, bút; Chỉ hoạt động: đọc');
    expect(notebookEntry(challenge({ mechanic: 'sort', items: [{ id: 'x', label: 'Tranh 1' }, { id: 'y', label: 'Tranh 2' }] }), { order: ['x', 'y'] }, fill)?.answer).toBe('Tranh 1 → Tranh 2');
    expect(notebookEntry(challenge({ mechanic: 'clock', mode: 'read', display: 'analog' }), { hour: 3, minute: 0 }, fill)?.answer).toBe('3 giờ');
    expect(notebookEntry(challenge({ mechanic: 'clock', mode: 'set', display: 'analog' }), { hour: 7, minute: 30 }, fill)?.answer).toBe('7 giờ 30 phút');
    expect(notebookEntry(challenge({ mechanic: 'calendar', month: 11, year: 2026, question: 'Ngày 20 là thứ mấy?', ask: 'weekday' }), { weekday: 'thu-sau' }, fill)?.answer).toBe('Thứ Sáu');
    expect(
      notebookEntry(challenge({ mechanic: 'connect', points: [{ id: 'a', x: 0, y: 0, label: 'A' }, { id: 'b', x: 1, y: 0, label: 'B' }, { id: 'c', x: 1, y: 1, label: 'C' }] }), { edges: [['a', 'b'], ['b', 'c']] }, fill)?.answer,
    ).toBe('AB, BC');
    expect(notebookEntry({ ...base, kind: 'riddle', question: 'Mấy quả?' } as unknown as QuestStepPublic, { value: 13 }, fill)?.answer).toBe('13');
  });

  it('has nothing to copy for talking, the worksheet or a dialogue', () => {
    expect(notebookEntry({ ...base, kind: 'speak', prompt: 'Kể', hints: [] } as unknown as QuestStepPublic, { value: 1 }, fill)).toBeNull();
  });
});

describe('notebook storage', () => {
  afterEach(() => window.localStorage.clear());

  it('keeps each quest\'s entries per child, one per step, in the order answered', () => {
    keepInNotebook('child-1', 'q', { step: 'a', question: 'Q1', answer: 'A1' });
    keepInNotebook('child-1', 'q', { step: 'b', question: 'Q2', answer: 'A2' });
    keepInNotebook('child-1', 'q', { step: 'a', question: 'Q1', answer: 'A1 again' });
    expect(readNotebook('child-1', 'q').map((e) => e.answer)).toEqual(['A2', 'A1 again']);
    expect(readNotebook('child-2', 'q')).toEqual([]);
  });
});
