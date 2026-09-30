import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuestDefinition, type QuestStepPublic } from '@miu/schema/content';
import { QuestView, type CharacterDto, type StepCompleteRequest, type StepCompleteResponse } from '@miu/schema/game';
import type { PlayerData } from '../../player/player-data';
import { PROGRESS } from '../../player/test-fixtures';
import type { ActiveQuestView } from '../../quest/quest-flow';
import { LearningStep } from '../learning-step';
import questSgk from '../../../../../server/test/fixtures/quests/quest-sgk.json';
import { monthGrid } from './calendar-challenge';
import { stepTime } from './clock-challenge';
import { toggleEdge } from './connect-challenge';
import { templateParts } from './fill-blank-challenge';

// The server's fixture quest with every textbook mechanic, as the client receives it (no answers).
const view = QuestView.parse(QuestDefinition.parse(questSgk));
if (view.status !== 'active') throw new Error('quest-sgk is active');
const quest = view as ActiveQuestView;
const stepOf = (id: string): QuestStepPublic => {
  const step = quest.steps.find((s) => s.id === id);
  if (!step) throw new Error(`no step ${id}`);
  return step;
};

const CHARACTER: CharacterDto = { species: 'cat', name: 'Mochi', equipped: [] };
const DATA: PlayerData = { character: CHARACTER, progress: PROGRESS, quests: [] };
const response = (correct: boolean): StepCompleteResponse => ({
  correct,
  feedback: null,
  quest: { questId: 'quest-sgk', completedSteps: [], completed: false, found: {}, stars: null },
  reward: null,
  repeated: false,
  completion: null,
  progress: PROGRESS,
});

function renderStep(id: string) {
  const submit = vi.fn(async (_s: QuestStepPublic, _b: StepCompleteRequest) => response(true));
  render(<LearningStep step={stepOf(id)} quest={quest} data={DATA} busy={false} submit={submit} onClose={() => undefined} />);
  return submit;
}
const byId = (id: string) => {
  const el = document.querySelector(`[data-id="${id}"]`);
  if (!el) throw new Error(`no element ${id}`);
  return el;
};
const tap = (id: string) => fireEvent.click(byId(id));
/** A tap on a draggable tile: press and release in place, then the tile's own click. */
const tapTile = (id: string) => {
  fireEvent.pointerDown(byId(id), { pointerId: 1, clientX: 0, clientY: 0 });
  fireEvent.pointerUp(byId(id), { pointerId: 1, clientX: 0, clientY: 0 });
  fireEvent.click(byId(id));
};
const check = () => fireEvent.click(screen.getByRole('button', { name: /Kiểm tra/ }));
const body = (submit: ReturnType<typeof vi.fn>) => submit.mock.calls.at(-1)?.[1] as StepCompleteRequest | undefined;

Element.prototype.setPointerCapture = () => undefined;
afterEach(cleanup);

describe('textbook mechanic screens send the answer the server grades', () => {
  it('classify: tap a card then a group; a placed card taps back out; drag works too', () => {
    const submit = renderStep('sort-words');
    const check_ = screen.getByRole('button', { name: /Kiểm tra/ }) as HTMLButtonElement;
    tapTile('card-sach');
    tap('group-title-su-vat');
    tapTile('card-doc');
    tap('group-title-su-vat');
    expect(check_.disabled).toBe(true);
    tapTile('card-doc'); // placed: back to the pool
    tapTile('card-doc');
    tap('group-title-hoat-dong');
    document.elementFromPoint = vi.fn(() => byId('group-su-vat'));
    fireEvent.pointerDown(byId('card-but'), { pointerId: 2, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(byId('card-but'), { pointerId: 2, clientX: 120, clientY: 60 });
    fireEvent.pointerUp(byId('card-but'), { pointerId: 2, clientX: 120, clientY: 60 });
    expect(check_.disabled).toBe(false);
    check();
    expect(body(submit)).toEqual({ answer: { assignment: { sach: 'su-vat', doc: 'hoat-dong', but: 'su-vat' } } });
  });

  it('classify cards and groups are buttons, so the keyboard works like a tap', () => {
    const submit = renderStep('sort-words');
    for (const [card, group] of [['sach', 'su-vat'], ['doc', 'hoat-dong'], ['but', 'su-vat']] as const) {
      expect(byId(`card-${card}`).tagName).toBe('BUTTON');
      fireEvent.click(byId(`card-${card}`)); // Enter or Space on a focused button
      tap(`group-title-${group}`);
    }
    check();
    expect(body(submit)?.answer).toEqual({ assignment: { sach: 'su-vat', doc: 'hoat-dong', but: 'su-vat' } });
  });

  it('fill-blank: the sentence shows its blank; picking an option fills it', () => {
    const submit = renderStep('fill');
    expect(byId('fill-sentence').textContent).toBe('47 ? 38');
    tap('option-b1-lon');
    expect(byId('blank-b1').textContent).toBe('>');
    check();
    expect(body(submit)?.answer).toEqual({ fills: { b1: 'lon' } });
  });

  it('multi-select: toggles each choice and sends the set', () => {
    const submit = renderStep('pick-even');
    tap('choice-p1');
    tap('choice-p2');
    tap('choice-p3');
    tap('choice-p2');
    expect(byId('choice-p1').getAttribute('aria-checked')).toBe('true');
    check();
    expect(body(submit)?.answer).toEqual({ choices: ['p1', 'p3'] });
  });

  it('clock: reads the face shown and sends the time set with +/− or arrow keys', () => {
    const submit = renderStep('read-clock');
    expect(byId('clock-face').getAttribute('aria-label')).toBe('Đồng hồ cần đọc');
    for (let i = 0; i < 3; i += 1) tap('clock-hour-up'); // 12 → 3
    fireEvent.keyDown(byId('clock-minute'), { key: 'ArrowUp' });
    fireEvent.keyDown(byId('clock-minute'), { key: 'ArrowDown' });
    check();
    expect(body(submit)?.answer).toEqual({ hour: 3, minute: 0 });
  });

  it('calendar: asks for a weekday when the step does', () => {
    const submit = renderStep('calendar');
    expect(document.querySelector('[data-id="day-20"]')).toBeNull();
    tap('weekday-thu-sau');
    check();
    expect(body(submit)?.answer).toEqual({ weekday: 'thu-sau' });
  });

  it('connect: tap two points to draw a segment, the same pair again to rub it out', () => {
    const submit = renderStep('draw');
    tap('point-a');
    tap('point-b');
    tap('point-b');
    tap('point-c');
    tap('point-c');
    tap('point-a');
    tap('point-a');
    tap('point-c'); // rubbed out again
    expect(document.querySelector('[data-id="edge-b-c"] text')?.textContent).toBe('3 cm');
    check();
    expect(body(submit)?.answer).toEqual({ edges: [['a', 'b'], ['b', 'c']] });
  });

  it('sort shows item pictures', () => {
    renderStep('order-pictures');
    expect(byId('stone-t2').querySelector('[data-id="picture-card"]')?.textContent).toBe('Tranh 2');
  });

  it('read shows the passage glossary when the book prints one', () => {
    const withGlossary = { ...quest, texts: { 'bai-doc': { title: 'Bài', body: 'Níu tay mẹ.', glossary: [{ term: 'Níu', meaning: 'nắm lấy và kéo lại.' }] } } };
    const submit = vi.fn(async () => response(true));
    render(<LearningStep step={stepOf('read-text')} quest={withGlossary} data={DATA} busy={false} submit={submit} onClose={() => undefined} />);
    expect(byId('read-glossary').textContent).toContain('Níu');
  });

  it('speak and worksheet finish with an empty body (nothing is graded or recorded)', () => {
    const talk = renderStep('talk');
    expect(byId('speak-hints').textContent).toContain('Em đi đâu?');
    tap('speak-done');
    expect(body(talk)).toEqual({});
    cleanup();
    const write = renderStep('write');
    tap('worksheet-done');
    expect(body(write)).toEqual({});
  });
});

describe('mechanic helpers', () => {
  it('cuts a template into text and blanks', () => {
    expect(templateParts('{{b1}}á và {{b2}}ẹo.')).toEqual([{ blank: 'b1' }, { text: 'á và ' }, { blank: 'b2' }, { text: 'ẹo.' }]);
  });

  it('steps clock time: minutes by five, hours wrapping at 12 or 24', () => {
    expect(stepTime({ hour: 12, minute: 55 }, 'minute', 1, 'analog')).toEqual({ hour: 12, minute: 0 });
    expect(stepTime({ hour: 12, minute: 0 }, 'hour', 1, 'analog')).toEqual({ hour: 1, minute: 0 });
    expect(stepTime({ hour: 1, minute: 0 }, 'hour', -1, 'analog')).toEqual({ hour: 12, minute: 0 });
    expect(stepTime({ hour: 23, minute: 0 }, 'hour', 1, 'digital')).toEqual({ hour: 0, minute: 0 });
  });

  it('lays a month out Monday first', () => {
    const november = monthGrid(11, 2026); // 1 November 2026 is a Sunday
    expect(november[0]).toEqual([null, null, null, null, null, null, 1]);
    expect(november.flat().filter((d) => d !== null)).toHaveLength(30);
  });

  it('toggles segments regardless of direction', () => {
    expect(toggleEdge([['a', 'b']], ['b', 'a'])).toEqual([]);
    expect(toggleEdge([], ['a', 'b'])).toEqual([['a', 'b']]);
  });
});
