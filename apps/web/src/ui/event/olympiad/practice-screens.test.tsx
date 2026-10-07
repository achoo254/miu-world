import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExamSubmitResponse, OlympiadQuestionPublic } from '@miu/schema/olympiad';
import { ExamReview } from './exam-review';
import { MockExam } from './mock-exam';
import { PracticeRun } from './practice-run';

const QUESTIONS: OlympiadQuestionPublic[] = [
  {
    id: 'q-1',
    topicId: 'logic',
    title: { vi: 'Cái cân', en: 'The scale' },
    prompt: { vi: '{name} cân quả táo: bao nhiêu?', en: '{name} weighs the apple: how much?' },
    visual: { type: 'equation', left: '3 + ?', right: '5' },
    choices: [
      { id: 'A', text: '1' },
      { id: 'B', text: '2' },
    ],
  },
  {
    id: 'q-2',
    topicId: 'logic',
    title: { vi: 'Dãy số', en: 'Number row' },
    prompt: { vi: 'Số tiếp theo?', en: 'What comes next?' },
    choices: [
      { id: 'A', text: '8' },
      { id: 'B', text: '9' },
    ],
  },
];

type Reply = { status?: number; body: unknown };
/** The server's answers by method and path; every request is kept to check what was sent. */
function serve(routes: Record<string, (body: unknown) => Reply>) {
  const sent: Array<{ path: string; body: unknown }> = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined;
      const key = `${init?.method ?? 'GET'} ${url}`;
      sent.push({ path: key, body });
      const route = routes[key];
      const reply = route ? route(body) : { status: 404, body: { error: 'not-found' } };
      return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200 });
    }),
  );
  return sent;
}

const fill = (text: string) => text.replace('{name}', 'Mochi');
const click = (dataId: string) => {
  const el = document.querySelector(`[data-id="${dataId}"]`);
  if (!el) throw new Error(`no ${dataId}`);
  fireEvent.click(el);
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('a practice run', () => {
  it('opens the hint after a miss and the answer after two, all graded and handed out by the server', async () => {
    serve({
      'POST /api/olympiad/practice/q-1/check': () => ({ body: { correct: false, explanation: null } }),
      'POST /api/olympiad/practice/q-1/support': (b) =>
        (b as { layer: string }).layer === 'answer'
          ? { body: { layer: 'answer', choice: 'B', explanation: { vi: '3 + 2 = 5', en: '3 + 2 = 5' } } }
          : { body: { layer: (b as { layer: string }).layer, text: { vi: 'Đếm thêm từ 3', en: 'Count on from 3' } } },
    });
    render(<PracticeRun topic={{ id: 'logic', name: { vi: 'Tư duy', en: 'Logic' } }} questions={QUESTIONS} fill={fill} onBack={() => undefined} onFinished={() => undefined} />);
    expect(screen.getByText('Mochi cân quả táo: bao nhiêu?')).toBeTruthy();
    // Only the guide before any miss.
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toHaveLength(1);
    click('olympiad-choice-A');
    click('olympiad-check');
    await vi.waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(2));
    expect(document.querySelector('[data-id="olympiad-line"]')).toBeTruthy();
    click('olympiad-check');
    await vi.waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(3));
    fireEvent.click(screen.getAllByRole('tab')[2] as HTMLElement);
    expect((await screen.findByText('3 + 2 = 5')).closest('[data-id="olympiad-support-answer"]')?.textContent).toContain('Đáp án đúng là 2.');
  });

  it('shows the explanation once right and is paid on finishing for what the server counted', async () => {
    const sent = serve({
      'POST /api/olympiad/practice/q-1/check': () => ({ body: { correct: true, explanation: { vi: 'Vì 3 + 2 = 5', en: 'Since 3 + 2 = 5' } } }),
      'POST /api/olympiad/practice/q-2/check': () => ({ body: { correct: true, explanation: { vi: 'Cộng thêm 1', en: 'Add 1' } } }),
      'POST /api/olympiad/practice/logic/finish': () => ({ body: { correct: 2, questions: 2, stars: 5, rewards: { xp: 10, coin: 2 }, repeated: false } }),
    });
    const finished = vi.fn();
    render(<PracticeRun topic={{ id: 'logic', name: { vi: 'Tư duy', en: 'Logic' } }} questions={QUESTIONS} fill={fill} onBack={() => undefined} onFinished={finished} />);
    click('olympiad-choice-B');
    click('olympiad-check');
    expect(await screen.findByText('Vì 3 + 2 = 5')).toBeTruthy();
    click('olympiad-next');
    click('olympiad-choice-B');
    click('olympiad-check');
    await screen.findByText('Cộng thêm 1');
    click('olympiad-next');
    await vi.waitFor(() => expect(finished).toHaveBeenCalledWith({ correct: 2, questions: 2, stars: 5, rewards: { xp: 10, coin: 2 }, repeated: false }));
    // One run id names every answer and the finish (a resent request pays nothing twice).
    const runIds = new Set(sent.map((s) => (s.body as { runId?: string } | undefined)?.runId));
    expect(runIds.size).toBe(1);
  });
});

describe('the mock exam', () => {
  it('starts with the clock off and hands in what was answered', async () => {
    const sent = serve({ 'POST /api/olympiad/submit': () => ({ status: 500, body: { error: 'internal' } }) });
    render(<MockExam questions={QUESTIONS} fill={fill} onBack={() => undefined} onSubmitted={() => undefined} />);
    expect(document.querySelector('[data-id="olympiad-time-left"]')).toBeNull();
    click('olympiad-exam-choice-B');
    click('olympiad-submit');
    expect(document.querySelector('[data-id="olympiad-submit-ask"]')?.textContent).toContain('Còn 1 câu bỏ trống');
    click('olympiad-submit-yes');
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(sent.find((s) => s.path === 'POST /api/olympiad/submit')?.body).toMatchObject({ answers: { 'q-1': 'B' } });
  });

  it('shows the 60-minute clock only when the player switches it on', () => {
    serve({});
    render(<MockExam questions={QUESTIONS} fill={fill} onBack={() => undefined} onSubmitted={() => undefined} />);
    click('olympiad-timer');
    expect(document.querySelector('[data-id="olympiad-time-left"]')?.textContent).toBe('Còn 60:00');
  });
});

describe('reviewing a handed-in exam', () => {
  it('lists only the misses when asked, with the choice made and all three layers', () => {
    const item = (q: OlympiadQuestionPublic, chosen: 'A' | 'B' | null, answer: 'A' | 'B') => ({
      ...q,
      chosen,
      answer,
      correct: chosen === answer,
      guide: { vi: `Hướng dẫn ${q.id}`, en: `Guide ${q.id}` },
      hint: { vi: `Gợi ý ${q.id}`, en: `Hint ${q.id}` },
      explanation: { vi: `Giải thích ${q.id}`, en: `Why ${q.id}` },
    });
    const [first, second] = QUESTIONS as [OlympiadQuestionPublic, OlympiadQuestionPublic];
    const result = { review: [item(first, 'A', 'B'), item(second, 'B', 'B')] } as unknown as ExamSubmitResponse;
    render(<ExamReview result={result} onlyMisses fill={fill} onBack={() => undefined} />);
    expect(document.querySelectorAll('.olympiad-review-item')).toHaveLength(1);
    const shown = document.querySelector('[data-id="olympiad-review-q-1"]')?.textContent ?? '';
    expect(shown).toContain('Bạn chọn: 1');
    expect(shown).toContain('Hướng dẫn q-1');
    expect(shown).toContain('Gợi ý q-1');
    expect(shown).toContain('Đáp án đúng là 2.');
  });
});
