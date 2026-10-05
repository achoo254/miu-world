import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { INITIAL_SNAPSHOT, createGameStore, reduce, type GameCommand } from './game-store';
import { GameStoreContext, useGameState } from './use-game-state';

afterEach(cleanup);

const parrot = { targetId: 'parrot-guide', kind: 'npc', name: 'Vẹt', label: 'Nói chuyện' } as const;

describe('game store', () => {
  it('counts each quest asked for from the full map, the same one twice included', () => {
    const once = reduce(INITIAL_SNAPSHOT, { type: 'quest-pick', questId: 'vuot-ai-khu-rung' });
    expect(once.questPick).toEqual({ questId: 'vuot-ai-khu-rung', count: 1 });
    expect(reduce(once, { type: 'quest-pick', questId: 'vuot-ai-khu-rung' }).questPick).toEqual({ questId: 'vuot-ai-khu-rung', count: 2 });
  });

  it('notifies subscribers on change and stops after unsubscribe', () => {
    const store = createGameStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.emit({ type: 'ready' });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.emit({ type: 'error', code: 'load-failed', message: 'x' });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('keeps the snapshot identity when an event changes nothing', () => {
    const store = createGameStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.emit({ type: 'interaction-prompt', prompt: parrot });
    const first = store.getSnapshot();
    store.emit({ type: 'interaction-prompt', prompt: { ...parrot } });
    store.emit({ type: 'ready' });
    store.emit({ type: 'ready' });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot().prompt).toBe(first.prompt);
  });

  it('counts interactions across targets', () => {
    const store = createGameStore();
    store.emit({ type: 'interaction', targetId: 'parrot-guide' });
    store.emit({ type: 'interaction', targetId: 'parrot-guide' });
    expect(store.getSnapshot().lastInteraction).toEqual({ targetId: 'parrot-guide', count: 2 });
    store.emit({ type: 'interaction', targetId: 'chest-1' });
    expect(store.getSnapshot().lastInteraction).toEqual({ targetId: 'chest-1', count: 3 });
  });

  it('starts over when the next map loads after a gate: loading again, so its ready is news to every listener', () => {
    let state = reduce(INITIAL_SNAPSHOT, { type: 'ready' });
    state = reduce(state, { type: 'autowalk-available', available: true });
    state = reduce(state, { type: 'interaction-prompt', prompt: { targetId: 'a', kind: 'npc', name: 'A', label: 'Nói chuyện' } });
    state = reduce(state, { type: 'loading' });
    expect(state).toMatchObject({ status: 'loading', prompt: null, autowalkAvailable: false, autowalk: 'idle' });
    expect(reduce(state, { type: 'ready' }).status).toBe('ready');
  });

  it('keeps the equipped vehicle and whether she rides it, and forgets it when the next map loads', () => {
    const offered = reduce(INITIAL_SNAPSHOT, { type: 'vehicle', vehicle: { name: 'Ván trượt đỏ', riding: false } });
    expect(offered.vehicle).toEqual({ name: 'Ván trượt đỏ', riding: false });
    expect(reduce(offered, { type: 'vehicle', vehicle: { name: 'Ván trượt đỏ', riding: false } })).toBe(offered);
    const riding = reduce(offered, { type: 'vehicle', vehicle: { name: 'Ván trượt đỏ', riding: true } });
    expect(riding.vehicle?.riding).toBe(true);
    expect(reduce(riding, { type: 'vehicle', vehicle: null }).vehicle).toBeNull();
    expect(reduce(riding, { type: 'loading' }).vehicle).toBeNull();
  });

  it('tracks loading progress, clamped to the total and unchanged on repeats', () => {
    const one = reduce(INITIAL_SNAPSHOT, { type: 'loading-progress', done: 1, total: 5 });
    expect(one.loading).toEqual({ done: 1, total: 5 });
    expect(reduce(one, { type: 'loading-progress', done: 1, total: 5 })).toBe(one);
    expect(reduce(one, { type: 'loading-progress', done: 9, total: 5 }).loading).toEqual({ done: 5, total: 5 });
  });

  it('keeps the error code (context lost vs load failure) and drops the prompt', () => {
    const near = reduce(reduce(INITIAL_SNAPSHOT, { type: 'ready' }), { type: 'interaction-prompt', prompt: parrot });
    const lost = reduce(near, { type: 'error', code: 'context-lost', message: 'WebGL context lost' });
    expect(lost.status).toBe('error');
    expect(lost.error).toEqual({ code: 'context-lost', message: 'WebGL context lost' });
    expect(lost.prompt).toBeNull();
  });

  it('treats a changed kind or label as a new prompt', () => {
    const near = reduce(INITIAL_SNAPSHOT, { type: 'interaction-prompt', prompt: parrot });
    expect(reduce(near, { type: 'interaction-prompt', prompt: { ...parrot, label: 'Hỏi đường' } })).not.toBe(near);
    expect(reduce(near, { type: 'interaction-prompt', prompt: { ...parrot, kind: 'object' } })).not.toBe(near);
  });

  it('routes every React command to the game, and stops after unsubscribe', () => {
    const store = createGameStore();
    const handler = vi.fn();
    const off = store.onCommand(handler);
    const commands: GameCommand[] = [
      { type: 'interact' },
      { type: 'set-outfit', equipped: ['hat-witch-pink', 'backpack-brown:blue'] },
      { type: 'set-world-state', state: { 'clue-1': 'found', 'chest-1': 'open', 'letter-1': 'hidden' } },
      { type: 'set-target-hint', targetId: 'parrot-guide' },
      { type: 'set-target-hint', targetId: null },
      { type: 'ride', on: true },
      { type: 'ride', on: false },
    ];
    for (const command of commands) store.send(command);
    expect(handler.mock.calls.map(([command]) => command)).toEqual(commands);
    off();
    store.send({ type: 'interact' });
    expect(handler).toHaveBeenCalledTimes(commands.length);
  });

  it('commands do not touch the snapshot', () => {
    const store = createGameStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.send({ type: 'set-target-hint', targetId: 'parrot-guide' });
    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(INITIAL_SNAPSHOT);
  });
});

describe('useGameState', () => {
  it('re-renders only when the selected slice changes', () => {
    const store = createGameStore();
    let statusRenders = 0;
    let promptRenders = 0;
    function Status() {
      statusRenders += 1;
      return <p>{useGameState((s) => s.status)}</p>;
    }
    function Prompt() {
      promptRenders += 1;
      return <p>{useGameState((s) => s.prompt?.name ?? 'none')}</p>;
    }
    render(
      <GameStoreContext.Provider value={store}>
        <Status />
        <Prompt />
      </GameStoreContext.Provider>,
    );
    expect(statusRenders).toBe(1);
    act(() => store.emit({ type: 'interaction-prompt', prompt: parrot }));
    expect(screen.getByText('Vẹt')).toBeTruthy();
    expect(statusRenders).toBe(1);
    expect(promptRenders).toBe(2);
    act(() => store.emit({ type: 'ready' }));
    expect(screen.getByText('ready')).toBeTruthy();
    expect(promptRenders).toBe(2);
  });
});
