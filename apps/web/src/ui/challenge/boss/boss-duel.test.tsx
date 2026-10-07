import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DuelMove, QuestStepPublic } from '@miu/schema/content';
import type { StepAnswer } from '@miu/schema/game';
import { createGameStore, type GameCommand } from '../../../game-bridge/game-store';
import { GameStoreContext } from '../../../game-bridge/use-game-state';
import { setLangMode } from '../../i18n/i18n';
import type { ChallengeContext } from '../challenge-frame';
import { BossDuel, HIT_BEAT_MS, type BossBlow } from './boss-duel';

type BossStep = Extract<QuestStepPublic, { kind: 'boss' }>;

const turn = (id: string, move: DuelMove, prompt: string, choices: Array<[string, string]>) => ({
  id,
  prompt,
  skill: 'toan',
  move,
  choices: choices.map(([cid, text]) => ({ id: cid, text })),
  damage: 80,
});

const bossStep: BossStep = {
  id: 'boss-forest',
  title: 'Trùm Vui Rừng Xanh',
  goTo: 'Gặp Trùm Vui',
  trigger: 'auto',
  kind: 'boss',
  bossId: 'golem-tree',
  bossName: 'Người Cây Rừng Già',
  introDialogue: 'Muốn qua đây, {name} hãy giải đố với ta!',
  winDialogue: 'Thông minh quá, khu rừng mở lối rồi!',
  maxHp: 240,
  damagePerTurn: 80,
  turns: [
    turn('turn-1', 'fling', 'Con mèo kêu như thế nào?', [['meo', 'Meo meo'], ['gau', 'Gâu gâu'], ['ec', 'Ếch ộp']]),
    turn('turn-2', 'orbs', '10 cộng 10 bằng mấy?', [['c20', '20'], ['c30', '30']]),
    turn('turn-3', 'charge', '5 cộng 5 bằng mấy?', [['c10', '10'], ['c11', '11'], ['c12', '12']]),
  ],
};
/** The same fight with its first question answered with each move. */
const withFirstMove = (move: DuelMove): BossStep => ({ ...bossStep, turns: [{ ...bossStep.turns[0], move } as BossStep['turns'][number], ...bossStep.turns.slice(1)] });

const context: ChallengeContext = {
  questId: 'quest-forest',
  stepId: 'boss-forest',
  title: { vi: 'Trùm Vui Rừng Xanh', en: 'Trùm Vui Rừng Xanh' },
  position: { index: 1, total: 1 },
  xp: 100,
  fill: (t) => t.replace('{name}', 'Mochi'),
  say: (vi, en) => ({ vi, en: en ?? vi }),
  busy: false,
  tryAgain: null,
  wrongTries: 0,
  onClose: () => undefined,
};

const right = (copy = true, won = false): BossBlow => ({ correct: true, won, copy: copy ? { step: 'boss-forest', question: 'Con mèo kêu như thế nào?', answer: 'Meo meo' } : null });
const wrong: BossBlow = { correct: false, won: false, copy: null };

/** The fight staged in the running world: a store whose game said `staged`, its commands recorded. */
function stagedStore() {
  const store = createGameStore();
  const sent: GameCommand[] = [];
  store.onCommand((c) => sent.push(c));
  store.emit({ type: 'duel', state: 'staged' });
  return { store, sent };
}

function renderDuel(ui: ReactElement, store?: ReturnType<typeof createGameStore>) {
  return render(store ? <GameStoreContext.Provider value={store}>{ui}</GameStoreContext.Provider> : ui);
}

const choice = (id: string): HTMLButtonElement => document.querySelector(`[data-id="choice-${id}"]`) as HTMLButtonElement;
const field = (): HTMLElement => document.querySelector('[data-id="boss-move"]') as HTMLElement;

/** Every element at a fixed spot on screen (jsdom lays nothing out). */
function placeAt(el: Element, x: number, y: number, size = 60): void {
  el.getBoundingClientRect = () => ({ left: x, top: y, right: x + size, bottom: y + size, width: size, height: size, x, y, toJSON: () => ({}) });
}

// jsdom has no pointer capture; browsers do.
Element.prototype.setPointerCapture = () => undefined;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('BossDuel as a card (no fight staged in the world)', () => {
  it('shows the boss, its HP, its opening line, the first question and how it is played', () => {
    renderDuel(<BossDuel step={bossStep} context={context} onAnswer={vi.fn()} onClose={() => undefined} />);
    expect(screen.getByText('Người Cây Rừng Già')).not.toBeNull();
    expect(screen.getByText('240 / 240 HP')).not.toBeNull();
    expect(screen.getByText('Muốn qua đây, Mochi hãy giải đố với ta!')).not.toBeNull();
    expect(screen.getByText('Con mèo kêu như thế nào?')).not.toBeNull();
    expect(field().dataset).toMatchObject({ move: 'fling', mode: 'card' });
    expect(screen.queryByText(/Giải đố/)).toBeNull();
  });

  it('answers each move by tapping (or Enter on) its target: one blow, the question and the choice', async () => {
    for (const move of ['fling', 'orbs', 'gem'] as const) {
      const onAnswer = vi.fn(async () => wrong);
      renderDuel(<BossDuel step={withFirstMove(move)} context={context} onAnswer={onAnswer} onClose={() => undefined} />);
      expect(field().dataset.move).toBe(move);
      // A real button: the keyboard reaches it with Tab and Enter presses it.
      expect(choice('gau').tagName).toBe('BUTTON');
      expect(choice('gau').disabled).toBe(false);
      await act(async () => fireEvent.click(choice('gau')));
      expect(onAnswer).toHaveBeenCalledTimes(1);
      expect(onAnswer).toHaveBeenCalledWith({ turnId: 'turn-1', choice: 'gau' });
      cleanup();
    }
  });

  it('charges a rune with three taps before the blow flies; another rune starts afresh; "Nạp chiêu" taps the picked one', async () => {
    const onAnswer = vi.fn(async () => wrong);
    renderDuel(<BossDuel step={withFirstMove('charge')} context={context} onAnswer={onAnswer} onClose={() => undefined} />);
    const charge = screen.getByRole('button', { name: /Nạp chiêu/ }) as HTMLButtonElement;
    expect(charge.disabled).toBe(true);
    await act(async () => fireEvent.click(choice('meo')));
    await act(async () => fireEvent.click(choice('meo')));
    await act(async () => fireEvent.click(choice('gau')));
    expect(onAnswer).not.toHaveBeenCalled();
    await act(async () => fireEvent.click(choice('gau')));
    expect(charge.disabled).toBe(false);
    await act(async () => fireEvent.click(charge));
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer).toHaveBeenCalledWith({ turnId: 'turn-1', choice: 'gau' });
  });

  it('throws the charm where it is dropped, or the way it is pulled back like a slingshot', async () => {
    const onAnswer = vi.fn(async (_a: StepAnswer) => wrong);
    renderDuel(<BossDuel step={withFirstMove('fling')} context={context} onAnswer={onAnswer} onClose={() => undefined} />);
    placeAt(choice('meo'), 0, 0);
    placeAt(choice('gau'), 300, 0);
    placeAt(choice('ec'), 150, -200);
    const charm = document.querySelector('[data-id="boss-charm"]') as HTMLElement;
    // Dropped on a shield.
    fireEvent.pointerDown(charm, { pointerId: 1, clientX: 150, clientY: 300 });
    fireEvent.pointerMove(charm, { pointerId: 1, clientX: 320, clientY: 30 });
    await act(async () => fireEvent.pointerUp(charm, { pointerId: 1, clientX: 320, clientY: 30 }));
    expect(onAnswer).toHaveBeenLastCalledWith({ turnId: 'turn-1', choice: 'gau' });
    // Pulled straight down and let go: it flies straight up, at the shield above.
    fireEvent.pointerDown(charm, { pointerId: 1, clientX: 180, clientY: 300 });
    fireEvent.pointerMove(charm, { pointerId: 1, clientX: 180, clientY: 360 });
    await act(async () => fireEvent.pointerUp(charm, { pointerId: 1, clientX: 180, clientY: 360 }));
    expect(onAnswer).toHaveBeenLastCalledWith({ turnId: 'turn-1', choice: 'ec' });
    // A little nudge is no throw.
    fireEvent.pointerDown(charm, { pointerId: 1, clientX: 180, clientY: 300 });
    await act(async () => fireEvent.pointerUp(charm, { pointerId: 1, clientX: 185, clientY: 305 }));
    expect(onAnswer).toHaveBeenCalledTimes(2);
  });

  it('sends the gem to the slot it is carried onto, and nowhere when dropped beside them', async () => {
    const onAnswer = vi.fn(async (_a: StepAnswer) => wrong);
    renderDuel(<BossDuel step={withFirstMove('gem')} context={context} onAnswer={onAnswer} onClose={() => undefined} />);
    placeAt(choice('meo'), 0, 0);
    placeAt(choice('gau'), 100, 0);
    placeAt(choice('ec'), 200, 0);
    const gem = document.querySelector('[data-id="boss-gem"]') as HTMLElement;
    fireEvent.pointerDown(gem, { pointerId: 1, clientX: 100, clientY: 400 });
    await act(async () => fireEvent.pointerUp(gem, { pointerId: 1, clientX: 100, clientY: 400 }));
    expect(onAnswer).not.toHaveBeenCalled();
    fireEvent.pointerDown(gem, { pointerId: 1, clientX: 100, clientY: 400 });
    fireEvent.pointerMove(gem, { pointerId: 1, clientX: 230, clientY: 30 });
    await act(async () => fireEvent.pointerUp(gem, { pointerId: 1, clientX: 230, clientY: 30 }));
    expect(onAnswer).toHaveBeenCalledWith({ turnId: 'turn-1', choice: 'ec' });
  });

  it('locks every answer while the server is busy, and sends nothing by itself however long it waits', async () => {
    vi.useFakeTimers();
    const onAnswer = vi.fn(async () => wrong);
    const { rerender } = renderDuel(<BossDuel step={bossStep} context={{ ...context, busy: true }} onAnswer={onAnswer} onClose={() => undefined} />);
    for (const id of ['meo', 'gau', 'ec']) expect(choice(id).disabled).toBe(true);
    rerender(<BossDuel step={bossStep} context={context} onAnswer={onAnswer} onClose={() => undefined} />);
    const before = document.body.innerHTML;
    await act(async () => {
      vi.advanceTimersByTime(10 * 60 * 1000);
    });
    expect(onAnswer).not.toHaveBeenCalled();
    expect(document.body.innerHTML).toBe(before);
  });

  it('keeps the HP the server gave after a miss, wobbles the answer and opens its hint', async () => {
    const onAnswer = vi.fn(async () => wrong);
    const { rerender } = renderDuel(<BossDuel step={bossStep} context={context} onAnswer={onAnswer} onClose={() => undefined} />);
    await act(async () => fireEvent.click(choice('gau')));
    expect(choice('gau').dataset.state).toBe('bounced');
    expect(screen.getByText('240 / 240 HP')).not.toBeNull();
    rerender(<BossDuel step={bossStep} context={context} turnTries={{ 'turn-1': 1 }} line={{ vi: 'Hụt rồi nhé!', en: 'Missed!' }} onAnswer={onAnswer} onClose={() => undefined} />);
    expect(screen.getByText('Hụt rồi nhé!')).not.toBeNull();
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Hướng dẫn', 'Gợi ý']);
  });

  it('hands the vở line on at once after a right blow, and takes a lost answer back without a sound of success', async () => {
    const onRight = vi.fn();
    let reply: BossBlow | null = null;
    const onAnswer = vi.fn(async () => reply);
    renderDuel(<BossDuel step={bossStep} context={context} onAnswer={onAnswer} onRight={onRight} onClose={() => undefined} />);
    await act(async () => fireEvent.click(choice('gau')));
    expect(onRight).not.toHaveBeenCalled();
    expect(choice('gau').disabled).toBe(false);
    reply = right();
    await act(async () => fireEvent.click(choice('meo')));
    expect(onRight).toHaveBeenCalledWith(right().copy);
  });

  it("says the server's line after a blow, the HP left when it has none, and floats the HP a blow took", () => {
    const { rerender } = renderDuel(<BossDuel step={bossStep} context={context} bossState={{ hp: 240, answered: [] }} onAnswer={vi.fn()} onClose={() => undefined} />);
    rerender(<BossDuel step={bossStep} context={context} bossState={{ hp: 160, answered: ['turn-1'] }} line={{ vi: 'Úi, trúng rồi!', en: 'Ouch, a hit!' }} onAnswer={vi.fn()} onClose={() => undefined} />);
    expect(screen.getByText('Úi, trúng rồi!')).not.toBeNull();
    expect(document.querySelector('[data-id="boss-damage"]')?.textContent).toBe('−80');
    rerender(<BossDuel step={bossStep} context={context} bossState={{ hp: 160, answered: ['turn-1'] }} onAnswer={vi.fn()} onClose={() => undefined} />);
    expect(screen.getByText('Cố lên nào! Ta vẫn còn 160 HP đấy!')).not.toBeNull();
    expect(field().dataset.move).toBe('orbs');
  });

  it('shows the boss beaten with its winning line when its HP is gone', () => {
    renderDuel(<BossDuel step={bossStep} context={context} bossState={{ hp: 0, answered: ['turn-1', 'turn-2', 'turn-3'] }} onAnswer={vi.fn()} onClose={() => undefined} />);
    expect(screen.getByText('0 / 240 HP')).not.toBeNull();
    expect(screen.getByText('Đã vượt qua thử thách trùm vui!')).not.toBeNull();
    expect(screen.getAllByText('Thông minh quá, khu rừng mở lối rồi!').length).toBeGreaterThan(0);
  });

  it('speaks English when the boss has its twins', () => {
    setLangMode('en', false);
    try {
      const step = {
        ...bossStep,
        en: { title: 'Forest fight', bossName: 'Old Tree Golem', introDialogue: 'Solve my riddles!', winDialogue: 'Clever you!' },
        turns: bossStep.turns.map((t, i) => (i === 0 ? { ...t, en: { prompt: 'What does a cat say?', choices: ['Meow', 'Woof', 'Ribbit'] } } : t)),
      };
      renderDuel(<BossDuel step={step} context={context} onAnswer={vi.fn()} onClose={() => undefined} />);
      expect(screen.getByText('Old Tree Golem')).not.toBeNull();
      expect(screen.getByText('Solve my riddles!')).not.toBeNull();
      expect(screen.getByText('What does a cat say?')).not.toBeNull();
      expect(screen.getByRole('button', { name: 'Meow' })).not.toBeNull();
    } finally {
      setLangMode('vi', false);
    }
  });

  it("gives each question its own Hướng dẫn · Gợi ý · Đáp án from the server, and seeing the answer never stops the fight", async () => {
    const asked: Array<{ url: string; body: unknown }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as { layer: string; turn: string };
        asked.push({ url, body });
        const reply = body.layer === 'guide' ? { layer: 'guide', steps: [`Đọc kĩ câu ${body.turn}.`] } : body.layer === 'hint' ? { layer: 'hint', text: `Gợi ý cho ${body.turn}.` } : { layer: 'answer', text: 'Meo meo', explanation: 'Mèo kêu meo meo.' };
        return new Response(JSON.stringify(reply), { status: 200 });
      }),
    );
    const tabs = () => screen.getAllByRole('tab').map((t) => t.textContent);
    const { rerender } = renderDuel(<BossDuel step={bossStep} context={context} onAnswer={vi.fn()} onClose={() => undefined} />);
    expect(tabs()).toEqual(['Hướng dẫn']);
    rerender(<BossDuel step={bossStep} context={context} turnTries={{ 'turn-1': 2 }} onAnswer={vi.fn()} onClose={() => undefined} />);
    expect(tabs()).toEqual(['Hướng dẫn', 'Gợi ý', 'Đáp án']);
    fireEvent.click(screen.getByRole('tab', { name: 'Đáp án' }));
    expect(await screen.findByText('Mèo kêu meo meo.')).not.toBeNull();
    expect(choice('meo').disabled).toBe(false);
    expect(asked).toEqual([{ url: '/api/quests/quest-forest/steps/boss-forest/support', body: { layer: 'answer', turn: 'turn-1' } }]);
    rerender(<BossDuel step={bossStep} context={context} bossState={{ hp: 160, answered: ['turn-1'] }} turnTries={{ 'turn-1': 2 }} onAnswer={vi.fn()} onClose={() => undefined} />);
    expect(tabs()).toEqual(['Hướng dẫn']);
  });

  it('plays with less motion when the device asks for it', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce'), addEventListener: () => undefined, removeEventListener: () => undefined }));
    renderDuel(<BossDuel step={withFirstMove('orbs')} context={context} onAnswer={vi.fn()} onClose={() => undefined} />);
    expect(field().dataset.calm).toBe('1');
  });
});

describe('BossDuel staged in the running world', () => {
  it('lays the answers round the boss, sends the blow flying, and its outcome to the boss', async () => {
    const { store, sent } = stagedStore();
    const onAnswer = vi.fn(async () => wrong);
    renderDuel(<BossDuel step={bossStep} context={context} onAnswer={onAnswer} onClose={() => undefined} />, store);
    expect(field().dataset.mode).toBe('stage');
    expect(document.querySelector('[data-id="boss-screen-backdrop"]')?.className).toContain('modal-backdrop--clear');
    // The anchors the game moves each frame are registered while the fight is staged.
    expect(store.getDuelAnchors()?.boss).toBeInstanceOf(HTMLElement);
    placeAt(choice('gau'), 300, 100);
    await act(async () => fireEvent.click(choice('gau')));
    expect(sent).toEqual([
      { type: 'duel-cue', cue: 'aim', to: { x: 330, y: 130 } },
      { type: 'duel-cue', cue: 'miss' },
    ]);
  });

  it('lets a right blow land before its vở card (a tap skips the wait), and a lost answer fizzle out', async () => {
    vi.useFakeTimers();
    const { store, sent } = stagedStore();
    const onRight = vi.fn();
    let reply: BossBlow | null = null;
    renderDuel(<BossDuel step={bossStep} context={context} onAnswer={async () => reply} onRight={onRight} onClose={() => undefined} />, store);
    await act(async () => fireEvent.click(choice('gau')));
    expect(sent.at(-1)).toEqual({ type: 'duel-cue', cue: 'fizzle' });
    reply = right();
    await act(async () => fireEvent.click(choice('meo')));
    expect(sent.at(-1)).toEqual({ type: 'duel-cue', cue: 'hit' });
    expect(onRight).not.toHaveBeenCalled();
    for (const id of ['meo', 'gau', 'ec']) expect(choice(id).disabled).toBe(true);
    await act(async () => {
      vi.advanceTimersByTime(HIT_BEAT_MS);
    });
    expect(onRight).toHaveBeenCalledTimes(1);
    // The next blow's wait is skipped by a tap anywhere.
    await act(async () => fireEvent.click(choice('meo')));
    expect(onRight).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByLabelText('Chạm để tiếp tục'));
    expect(onRight).toHaveBeenCalledTimes(2);
  });

  it("locks the answers on a teammate's blow and says whose it is; a teammate's blow that lands staggers the boss too", () => {
    const { store, sent } = stagedStore();
    const turnOf = { mine: false, who: 'Tôm' };
    const { rerender } = renderDuel(<BossDuel step={bossStep} context={context} bossState={{ hp: 240, answered: [] }} turnOf={turnOf} onAnswer={vi.fn()} onClose={() => undefined} />, store);
    for (const id of ['meo', 'gau', 'ec']) expect(choice(id).disabled).toBe(true);
    expect(screen.getByText('Lượt của Tôm')).not.toBeNull();
    // Help stays open to her meanwhile.
    expect((screen.getByRole('tab', { name: 'Hướng dẫn' }) as HTMLButtonElement).disabled).toBe(false);
    rerender(
      <GameStoreContext.Provider value={store}>
        <BossDuel step={bossStep} context={context} bossState={{ hp: 160, answered: ['turn-1'] }} turnOf={{ mine: true, who: 'Mochi' }} onAnswer={vi.fn()} onClose={() => undefined} />
      </GameStoreContext.Provider>,
    );
    expect(sent).toEqual([{ type: 'duel-cue', cue: 'ally-hit' }]);
    expect(document.querySelector('[data-id="boss-damage"]')?.textContent).toBe('−80');
    expect(choice('c20').disabled).toBe(false);
  });

  it('takes her own blow that lands for hers, whenever the new HP arrives', async () => {
    const { store, sent } = stagedStore();
    const ui = (state: { hp: number; answered: string[] }) => (
      <GameStoreContext.Provider value={store}>
        <BossDuel step={bossStep} context={context} bossState={state} onAnswer={async () => right()} onClose={() => undefined} />
      </GameStoreContext.Provider>
    );
    const { rerender } = render(ui({ hp: 240, answered: [] }));
    await act(async () => fireEvent.click(choice('meo')));
    rerender(ui({ hp: 160, answered: ['turn-1'] }));
    expect(sent.map((c) => (c.type === 'duel-cue' ? c.cue : c.type))).toEqual(['aim', 'hit']);
  });

  it('still hands the vở line on when the fight is put away while a blow lands, and keeps the struck question meanwhile', async () => {
    vi.useFakeTimers();
    const { store } = stagedStore();
    const onRight = vi.fn();
    const ui = (state: { hp: number; answered: string[] }) => (
      <GameStoreContext.Provider value={store}>
        <BossDuel step={bossStep} context={context} bossState={state} onAnswer={async () => right()} onRight={onRight} onClose={() => undefined} />
      </GameStoreContext.Provider>
    );
    const { rerender, unmount } = render(ui({ hp: 240, answered: [] }));
    await act(async () => fireEvent.click(choice('meo')));
    // The server's new state is in, yet the question struck stays on screen until its vở card.
    rerender(ui({ hp: 160, answered: ['turn-1'] }));
    expect(screen.getByText('Con mèo kêu như thế nào?')).not.toBeNull();
    expect(choice('meo').dataset.state).toBe('aimed');
    unmount();
    expect(onRight).toHaveBeenCalledTimes(1);
  });

  it('plays the winning blow out, then goes on to the reward', async () => {
    vi.useFakeTimers();
    const { store, sent } = stagedStore();
    const onWon = vi.fn();
    const onRight = vi.fn();
    renderDuel(<BossDuel step={bossStep} context={context} bossState={{ hp: 80, answered: ['turn-1', 'turn-2'] }} onAnswer={async () => right(true, true)} onRight={onRight} onWon={onWon} onClose={() => undefined} />, store);
    await act(async () => fireEvent.click(choice('c10')));
    await act(async () => fireEvent.click(choice('c10')));
    await act(async () => fireEvent.click(choice('c10')));
    expect(sent.at(-1)).toEqual({ type: 'duel-cue', cue: 'win' });
    expect(onWon).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(onRight).toHaveBeenCalledTimes(1);
    expect(onWon).toHaveBeenCalledTimes(1);
  });
});
