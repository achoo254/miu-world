import { describe, expect, it } from 'vitest';
import type { QuestStep } from '@miu/schema/content';
import { notebookLine, notebookLines } from './notebook';

const support = (text: string) => ({ guide: ['g'], hint: 'h', answer: { text, explanation: 'e' } });

describe('notebook lines', () => {
  it('pairs each question with the book\'s answer, showing a fill-in sentence with its blanks', () => {
    const steps = [
      { id: 'hi', title: 'Chào', kind: 'dialogue', lines: [{ speaker: 'Vẹt', text: 'Chào' }], choices: [] },
      { id: 'r', title: 'Đố', kind: 'riddle', question: 'Có mấy quyển sách?', skill: 's', answer: { value: 17 }, support: support('9 + 8 = 17. Đáp số: 17 quyển') },
      {
        id: 'f',
        title: 'Điền dấu',
        kind: 'challenge',
        mechanic: 'fill-blank',
        prompt: 'Điền dấu >, <, =',
        skill: 's',
        template: '47 {{b1}} 38',
        blanks: [{ id: 'b1', options: [{ id: 'gt', text: '>' }, { id: 'lt', text: '<' }] }],
        answer: { fills: { b1: 'gt' } },
        support: support('47 > 38'),
      },
      { id: 'w', title: 'Phiếu', kind: 'worksheet', lessonId: 'l', text: 'Viết' },
    ] as unknown as QuestStep[];
    expect(notebookLine(steps[0] as QuestStep)).toBeNull();
    expect(notebookLines(steps)).toEqual([
      { step: 'r', question: 'Có mấy quyển sách?', answer: '9 + 8 = 17. Đáp số: 17 quyển' },
      { step: 'f', question: 'Điền dấu >, <, =\n47 … 38', answer: '47 > 38' },
    ]);
  });
});
