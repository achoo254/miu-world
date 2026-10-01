import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuestStepPublic } from '@miu/schema/content';
import type { CharacterDto, StepCompleteRequest, StepCompleteResponse } from '@miu/schema/game';
import type { PlayerData } from '../player/player-data';
import { PROGRESS } from '../player/test-fixtures';
import type { ActiveQuestView } from '../quest/quest-flow';
import { LearningStep } from './learning-step';

const CHARACTER: CharacterDto = { species: 'cat', name: 'Mochi', equipped: [], pet: null };
const DATA: PlayerData = { character: CHARACTER, progress: PROGRESS, quests: [] };

const steps = {
  apples: QuestStepPublic.parse({
    id: 'apples',
    title: 'Hái táo',
    kind: 'challenge',
    mechanic: 'drag-drop',
    skill: 'phep-cong',
    prompt: 'Kéo đúng 3 quả táo vào giỏ.',
    container: 'Giỏ',
    pieces: [1, 2, 3, 4].map((n) => ({ id: `apple-${n}`, label: 'Quả táo', value: 1 })),
  }),
  stones: QuestStepPublic.parse({
    id: 'stones',
    title: 'Qua suối',
    kind: 'challenge',
    mechanic: 'sort',
    skill: 'so-sanh-so',
    prompt: 'Xếp từ bé đến lớn.',
    items: [
      { id: 's27', label: '27' },
      { id: 's9', label: '9' },
      { id: 's15', label: '15' },
    ],
  }),
  quiz: QuestStepPublic.parse({
    id: 'quiz',
    title: 'Chia kẹo',
    kind: 'challenge',
    mechanic: 'quiz',
    skill: 'phep-tru',
    prompt: 'Hải ly tặng {name} 3 viên, còn mấy viên?',
    choices: ['3', '5', '6'].map((t) => ({ id: `c${t}`, text: t })),
  }),
  riddle: QuestStepPublic.parse({ id: 'riddle', title: 'Câu đố', kind: 'riddle', skill: 'phep-cong', question: '8 + 5 = ?' }),
  letter: QuestStepPublic.parse({
    id: 'letter',
    title: 'Đọc lá thư',
    kind: 'read',
    skill: 'doc-hieu',
    text: 'Gửi {name},\nHải ly sẽ chỉ đường.',
    question: 'Ai chỉ đường?',
    choices: [
      { id: 'a', text: 'Bác Cú' },
      { id: 'b', text: 'Hải ly' },
    ],
  }),
};
const quest = {
  id: 'forest-ch1',
  region: 'khu-rung-bi-mat',
  chapter: 1,
  title: 'Q',
  status: 'active',
  summary: 's',
  texts: {},
  steps: Object.values(steps),
  reward: { xp: 100, coin: 20, skillXp: {}, items: {} },
} as ActiveQuestView;

function answerResponse(correct: boolean, feedback: string | null): StepCompleteResponse {
  return {
    correct,
    feedback,
    quest: { questId: 'forest-ch1', completedSteps: [], completed: false, found: {}, stars: null },
    reward: null,
    repeated: false,
    completion: null,
    progress: PROGRESS,
  };
}

function renderStep(step: QuestStepPublic, submit = vi.fn(async (_s: QuestStepPublic, _b: StepCompleteRequest) => answerResponse(true, null))) {
  render(<LearningStep step={step} quest={quest} data={DATA} busy={false} submit={submit} onClose={() => undefined} />);
  return submit;
}
function tapTile(selector: string): void {
  const el = document.querySelector(selector) as Element;
  fireEvent.pointerDown(el, { pointerId: 1, clientX: 0, clientY: 0 });
  fireEvent.pointerUp(el, { pointerId: 1, clientX: 0, clientY: 0 });
  fireEvent.click(el);
}
const check = () => fireEvent.click(screen.getByRole('button', { name: /Kiểm tra/ }));
const sentAnswer = (submit: ReturnType<typeof vi.fn>) => (submit.mock.calls.at(-1)?.[1] as StepCompleteRequest | undefined)?.answer;

// jsdom has no pointer capture; browsers do.
Element.prototype.setPointerCapture = () => undefined;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('learning steps send the answer the server checks', () => {
  it('drag-drop: tap an apple then the basket, or drag it there; tap out to remove', () => {
    const submit = renderStep(steps.apples);
    expect(screen.getByText(/Bước 1\/5/)).toBeTruthy();
    expect(screen.getByText(/100 XP/)).toBeTruthy();
    // A tap as the browser sends it: pointerdown, pointerup, then a click on the same tile.
    for (const n of [1, 2]) {
      tapTile(`[data-id="piece-apple-${n}"]`);
      fireEvent.click(document.querySelector('[data-id="drag-container"]') as Element);
    }
    expect(document.querySelector('[data-id="drag-count"]')?.textContent).toBe('2');
    // A drag: moved past the tap slop and released over the basket.
    document.elementFromPoint = vi.fn(() => document.querySelector('[data-id="drag-container"]'));
    const third = document.querySelector('[data-id="piece-apple-3"]') as Element;
    fireEvent.pointerDown(third, { pointerId: 2, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(third, { pointerId: 2, clientX: 200, clientY: 40 });
    fireEvent.pointerUp(third, { pointerId: 2, clientX: 200, clientY: 40 });
    fireEvent.click(third); // the click after a drag is not a tap
    expect(document.querySelector('[data-id="drag-count"]')?.textContent).toBe('3');
    // Tap an apple in the basket, then the tree side: it goes back.
    tapTile('[data-id="drag-container"] [data-id="piece-apple-3"]');
    fireEvent.click(document.querySelector('[data-id="drag-source"]') as Element);
    expect(document.querySelector('[data-id="drag-count"]')?.textContent).toBe('2');
    tapTile('[data-id="piece-apple-3"]');
    fireEvent.click(document.querySelector('[data-id="drag-container"]') as Element);
    check();
    expect(sentAnswer(submit)).toEqual({ placed: ['apple-1', 'apple-2', 'apple-3'] });
  });

  it('sort: tap a stone then a slot, reset clears, check sends the order', () => {
    const submit = renderStep(steps.stones);
    const put = (stone: string, slot: number) => {
      tapTile(`[data-id="stone-${stone}"]`);
      fireEvent.click(document.querySelector(`[data-id="slot-${slot}"]`) as Element);
    };
    put('s27', 0);
    fireEvent.click(screen.getByRole('button', { name: 'Làm lại' }));
    expect(document.querySelector('[data-id="slot-0"]')?.textContent).toBe('1');
    expect((screen.getByRole('button', { name: /Kiểm tra/ }) as HTMLButtonElement).disabled).toBe(true);
    put('s9', 0);
    put('s15', 1);
    put('s27', 2);
    check();
    expect(sentAnswer(submit)).toEqual({ order: ['s9', 's15', 's27'] });
  });

  it('quiz: fills the name, one choice at a time', () => {
    const submit = renderStep(steps.quiz);
    expect(screen.getByText('Hải ly tặng Mochi 3 viên, còn mấy viên?')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: '3' }));
    fireEvent.click(screen.getByRole('radio', { name: '5' }));
    expect(screen.getByRole('radio', { name: '5' }).getAttribute('aria-checked')).toBe('true');
    check();
    expect(sentAnswer(submit)).toEqual({ choice: 'c5' });
  });

  it('riddle: the number pad builds the value', () => {
    const submit = renderStep(steps.riddle);
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(document.querySelector('[data-id="riddle-value"]')?.textContent).toBe('13');
    check();
    expect(sentAnswer(submit)).toEqual({ value: 13 });
  });

  it('read: shows the passage in the player\'s name, then the question', () => {
    const submit = renderStep(steps.letter);
    expect(screen.getByText('Gửi Mochi,')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Hải ly' }));
    check();
    expect(sentAnswer(submit)).toEqual({ choice: 'b' });
  });

  it('a wrong answer keeps the screen with the server\'s kind line, filled with the name', async () => {
    renderStep(steps.quiz, vi.fn(async () => answerResponse(false, 'Đếm lùi ba bước nhé {name}.')));
    fireEvent.click(screen.getByRole('radio', { name: '6' }));
    check();
    expect((await screen.findByRole('status')).textContent).toBe('Đếm lùi ba bước nhé Mochi.');
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});

describe('scene feedback', () => {
  it('shows a leaf per quest step with the current one lit, and shakes the play area once after a wrong try', async () => {
    renderStep(steps.riddle, vi.fn(async (_s: QuestStepPublic, _b: StepCompleteRequest) => answerResponse(false, null)));
    const leaves = [...document.querySelectorAll('[data-id="challenge-trail"] li')];
    expect(leaves).toHaveLength(quest.steps.length);
    const current = quest.steps.findIndex((st) => st.id === 'riddle');
    expect(leaves.findIndex((l) => l.classList.contains('current'))).toBe(current);
    expect(leaves.filter((l) => l.classList.contains('done'))).toHaveLength(current);
    expect(document.querySelector('.challenge-area--wrong')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '7' }));
    await act(async () => check());
    expect(document.querySelector('.challenge-area--wrong')).not.toBeNull();
    expect(document.querySelector('.npc-portrait--encourage, [data-id="challenge-try-again"]')).not.toBeNull();
  });
});

describe('support panel', () => {
  it('asks the server for each layer once, and the answer layer still lets the child finish', async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        const { layer } = JSON.parse(String(init?.body)) as { layer: string };
        calls.push(layer);
        const body =
          layer === 'guide'
            ? { layer, steps: ['Bắt đầu từ 8.', 'Đếm thêm 5.'] }
            : layer === 'hint'
              ? { layer, text: 'Tách 5 thành 2 và 3, {name} nhé.' }
              : { layer, text: '13', explanation: '8 + 5 = 13.' };
        return new Response(JSON.stringify(body), { status: 200 });
      }),
    );
    // Two wrong tries first: the hint opens after the first, the answer after the second.
    const submit = renderStep(
      steps.riddle,
      vi.fn(async (_s: QuestStepPublic, _b: StepCompleteRequest) => answerResponse(false, null))
        .mockImplementationOnce(async () => answerResponse(false, null))
        .mockImplementationOnce(async () => answerResponse(false, null)),
    );
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Hướng dẫn']);
    fireEvent.click(screen.getByRole('button', { name: '7' }));
    await act(async () => check());
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Hướng dẫn', 'Gợi ý']);
    await act(async () => check());
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Hướng dẫn', 'Gợi ý', 'Đáp án']);
    fireEvent.click(screen.getByRole('tab', { name: 'Hướng dẫn' }));
    expect(await screen.findByText('Đếm thêm 5.')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Gợi ý' }));
    expect(await screen.findByText('Tách 5 thành 2 và 3, Mochi nhé.')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Hướng dẫn' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Đáp án' }));
    expect(await screen.findByText('8 + 5 = 13.')).toBeTruthy();
    expect(calls).toEqual(['guide', 'hint', 'answer']);
    fireEvent.click(screen.getByRole('button', { name: /Xoá|Làm lại/ }));
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    check();
    expect(sentAnswer(submit)).toEqual({ value: 13 });
  });
});
