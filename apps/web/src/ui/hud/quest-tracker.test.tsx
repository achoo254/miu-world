import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameStore } from '../../game-bridge/game-store';
import { GameStoreContext } from '../../game-bridge/use-game-state';
import type { PlayerData } from '../player/player-data';
import { PROGRESS, questList } from '../player/test-fixtures';
import { QuestTracker, TRACKER_FOLD_MS } from './hud';

const DATA: PlayerData = { character: { species: 'cat', name: 'Kem', equipped: [], pet: null }, progress: PROGRESS, quests: [] };
const quest = (done: number) => {
  const first = questList(done).quests[0];
  if (!first) throw new Error('no quest');
  return first;
};

function show(done = 0) {
  const store = createGameStore();
  const sent = vi.fn();
  store.onCommand(sent);
  const view = (n: number) => (
    <GameStoreContext.Provider value={store}>
      <QuestTracker quest={quest(n)} data={DATA} />
    </GameStoreContext.Provider>
  );
  const utils = render(view(done));
  return { store, sent, rerender: (n: number) => utils.rerender(view(n)) };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('QuestTracker folding', () => {
  it('folds with its button, opens again from the pill, and folding is not a tap on the card', () => {
    const { store, sent } = show();
    act(() => store.emit({ type: 'autowalk-available', available: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Thu gọn nhiệm vụ' }));
    expect(sent).not.toHaveBeenCalled();
    expect(screen.queryByText('Nhiệm vụ hiện tại')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Mở nhiệm vụ hiện tại' }));
    expect(screen.getByText('Nhiệm vụ hiện tại')).toBeTruthy();
  });

  it('folds by itself after the quiet time, and a touch on the card restarts the count', () => {
    show();
    act(() => void vi.advanceTimersByTime(TRACKER_FOLD_MS - 1000));
    fireEvent.pointerDown(screen.getByLabelText('Nhiệm vụ hiện tại'));
    act(() => void vi.advanceTimersByTime(TRACKER_FOLD_MS - 1000));
    expect(screen.getByText('Nhiệm vụ hiện tại')).toBeTruthy();
    act(() => void vi.advanceTimersByTime(1500));
    expect(screen.queryByText('Nhiệm vụ hiện tại')).toBeNull();
    expect(screen.getByText('Nhiệm vụ')).toBeTruthy();
  });

  it('opens by itself when the quest moves on to its next step', () => {
    const { rerender } = show(0);
    act(() => void vi.advanceTimersByTime(TRACKER_FOLD_MS + 100));
    expect(screen.queryByText('Nhiệm vụ hiện tại')).toBeNull();
    rerender(1);
    expect(screen.getByText('Nhiệm vụ hiện tại')).toBeTruthy();
  });
});
