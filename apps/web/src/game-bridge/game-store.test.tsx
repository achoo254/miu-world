import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGameStore } from './game-store';
import { GameStoreContext, useGameState } from './use-game-state';

afterEach(cleanup);

const parrot = { npcId: 'parrot-guide', name: 'Vẹt', label: 'Nói chuyện' };

describe('game store', () => {
  it('notifies subscribers on change and stops after unsubscribe', () => {
    const store = createGameStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.emit({ type: 'ready' });
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    store.emit({ type: 'error', message: 'x' });
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

  it('counts interactions', () => {
    const store = createGameStore();
    store.emit({ type: 'interaction', npcId: 'parrot-guide' });
    store.emit({ type: 'interaction', npcId: 'parrot-guide' });
    expect(store.getSnapshot().lastInteraction).toEqual({ npcId: 'parrot-guide', count: 2 });
  });

  it('routes React commands to the game', () => {
    const store = createGameStore();
    const handler = vi.fn();
    const off = store.onCommand(handler);
    store.send({ type: 'interact' });
    off();
    store.send({ type: 'interact' });
    expect(handler).toHaveBeenCalledTimes(1);
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
