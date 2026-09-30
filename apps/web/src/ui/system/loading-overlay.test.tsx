import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { createGameStore } from '../../game-bridge/game-store';
import { GameStoreContext } from '../../game-bridge/use-game-state';
import { LoadingOverlay } from './loading-overlay';

afterEach(cleanup);

function setup() {
  const store = createGameStore();
  render(
    <GameStoreContext.Provider value={store}>
      <LoadingOverlay region="Khu rừng bí mật" />
    </GameStoreContext.Provider>,
  );
  return store;
}

const bar = () => screen.getByRole('progressbar', { name: 'Đang tải Khu rừng bí mật' });

describe('LoadingOverlay', () => {
  it('shows the region and follows the boot steps', () => {
    const store = setup();
    expect(screen.getByText('Khu rừng bí mật')).toBeTruthy();
    expect(bar().getAttribute('aria-valuenow')).toBe('0');
    act(() => store.emit({ type: 'loading-progress', done: 2, total: 5 }));
    expect(bar().getAttribute('aria-valuenow')).toBe('40');
    expect(screen.getByText('40%')).toBeTruthy();
  });

  it('goes away once the game is ready', () => {
    const store = setup();
    act(() => store.emit({ type: 'ready' }));
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('goes away on a boot error so the error message is not hidden', () => {
    const store = setup();
    act(() => store.emit({ type: 'error', code: 'load-failed', message: 'x' }));
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});
