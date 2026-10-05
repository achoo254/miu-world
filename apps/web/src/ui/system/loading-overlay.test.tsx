import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGameStore } from '../../game-bridge/game-store';
import { GameStoreContext } from '../../game-bridge/use-game-state';
import { linesOf } from '../i18n/i18n';
import { LoadingOverlay, TIP_ROTATE_MS, nextLoadingTip, recallLook, rememberLook, type LoadingLook } from './loading-overlay';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.sessionStorage.clear();
});

function setup(look: LoadingLook | null = null) {
  const store = createGameStore();
  const view = render(
    <GameStoreContext.Provider value={store}>
      <LoadingOverlay region="Khu rừng bí mật" look={look} />
    </GameStoreContext.Provider>,
  );
  return { store, container: view.container };
}

const bar = () => screen.getByRole('progressbar', { name: 'Đang tải Khu rừng bí mật' });
const tipText = (container: HTMLElement): string => container.querySelector('[data-id="play-loading-tip"] [aria-live]')?.textContent ?? '';

describe('LoadingOverlay', () => {
  it('shows the region and follows the boot steps', () => {
    const { store } = setup();
    expect(screen.getByText('Khu rừng bí mật')).toBeTruthy();
    expect(bar().getAttribute('aria-valuenow')).toBe('0');
    act(() => store.emit({ type: 'loading-progress', done: 2, total: 5 }));
    expect(bar().getAttribute('aria-valuenow')).toBe('40');
    expect(screen.getByText('40%')).toBeTruthy();
  });

  it('goes away once the game is ready', () => {
    const { store } = setup();
    act(() => store.emit({ type: 'ready' }));
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('goes away on a boot error so the error message is not hidden', () => {
    const { store } = setup();
    act(() => store.emit({ type: 'error', code: 'load-failed', message: 'x' }));
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it("draws the player's own animal and what she wears, never Miu the mascot", () => {
    const { container } = setup({ species: 'fox', outfit: ['hat-witch-pink', 'backpack-brown'] });
    const art = [...container.querySelectorAll<HTMLImageElement>('.miu-art')].map((img) => img.getAttribute('src') ?? '');
    expect(art.length).toBeGreaterThan(0);
    expect(art.every((src) => src.includes('/character/fox-anim-'))).toBe(true);
    const worn = [...container.querySelectorAll('[data-id="play-loading-outfit"] [data-item]')].map((li) => li.getAttribute('data-item'));
    expect(worn).toContain('hat-witch-pink');
    expect(worn).toContain('backpack-brown');
    expect(container.querySelector('[data-id="play-loading"]')?.getAttribute('data-species')).toBe('fox');
  });

  it('waits with an empty island while her character is not known yet', () => {
    const { container } = setup(null);
    expect(container.querySelector('.miu-art')).toBeNull();
    expect(container.querySelector('[data-id="play-loading-outfit"]')).toBeNull();
  });

  it('shows a new tip while the loading lasts, never the one just shown', () => {
    vi.useFakeTimers();
    const { container } = setup();
    const pool = new Set(linesOf('loading.tips').map((line) => line.vi));
    const seen = [tipText(container)];
    for (let i = 0; i < 40; i++) {
      act(() => vi.advanceTimersByTime(TIP_ROTATE_MS));
      seen.push(tipText(container));
    }
    for (const tip of seen) expect(pool.has(tip)).toBe(true);
    for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
    expect(new Set(seen).size).toBeGreaterThan(20);
  });
});

describe('loading tips', () => {
  it('cover the game with a pool of 20 or more different tips in both languages', () => {
    const pool = linesOf('loading.tips');
    expect(pool.length).toBeGreaterThanOrEqual(20);
    expect(new Set(pool.map((line) => line.vi)).size).toBe(pool.length);
    expect(new Set(pool.map((line) => line.en)).size).toBe(pool.length);
    for (const line of pool) expect(line.en).not.toBe(line.vi);
  });

  it('go round the whole pool, one after another, never the same tip twice in a row', () => {
    const size = linesOf('loading.tips').length;
    const shown = Array.from({ length: size * 3 }, () => nextLoadingTip().vi);
    for (let i = 1; i < shown.length; i++) expect(shown[i]).not.toBe(shown[i - 1]);
    const counts = new Map<string, number>();
    for (const tip of shown) counts.set(tip, (counts.get(tip) ?? 0) + 1);
    expect(counts.size).toBe(size);
    for (const count of counts.values()) expect(count).toBeGreaterThanOrEqual(2);
  });
});

describe('the remembered look', () => {
  it('comes back for the same player only', () => {
    rememberLook('player-1', { species: 'bear', outfit: ['hat-witch-pink'] });
    expect(recallLook('player-1')).toEqual({ species: 'bear', outfit: ['hat-witch-pink'] });
    expect(recallLook('player-2')).toBeNull();
    expect(recallLook(null)).toBeNull();
  });
});
