import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGameStore } from '../../game-bridge/game-store';
import { GameStoreContext } from '../../game-bridge/use-game-state';
import { RideButton } from './ride-button';

afterEach(cleanup);

describe('RideButton', () => {
  it('shows only with a vehicle equipped, asks the game to get on, then offers to get off', () => {
    const store = createGameStore();
    const sent = vi.fn();
    store.onCommand(sent);
    render(
      <GameStoreContext.Provider value={store}>
        <RideButton />
      </GameStoreContext.Provider>,
    );
    expect(screen.queryByRole('button')).toBeNull();

    act(() => store.emit({ type: 'vehicle', vehicle: { name: 'Ván trượt đỏ', riding: false } }));
    fireEvent.click(screen.getByRole('button', { name: /Lái xe/ }));
    expect(sent).toHaveBeenLastCalledWith({ type: 'ride', on: true });

    act(() => store.emit({ type: 'vehicle', vehicle: { name: 'Ván trượt đỏ', riding: true } }));
    const off = screen.getByRole('button', { name: /Xuống xe/ });
    expect(off.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(off);
    expect(sent).toHaveBeenLastCalledWith({ type: 'ride', on: false });

    act(() => store.emit({ type: 'vehicle', vehicle: null }));
    expect(screen.queryByRole('button')).toBeNull();
  });
});
