import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGameStore, type GameCommand } from '../../game-bridge/game-store';
import { GameStoreContext } from '../../game-bridge/use-game-state';
import { PetHud } from './pet-hud';

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

function renderHud(props: { renamed?: string | null; hidden?: boolean } = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => json({ hasPet: true, petId: 'cun-con', bond: { name: 'Bông', stats: { happiness: 80, fullness: 75, cleanliness: 85 }, level: 1, xp: 0, levelXp: 0, nextLevelXp: 40, tricks: ['sit'], gear: [] } })),
  );
  const store = createGameStore();
  const sent: GameCommand[] = [];
  store.onCommand((c) => sent.push(c));
  const onOpen = vi.fn();
  const view = render(
    <GameStoreContext.Provider value={store}>
      <PetHud petId="cun-con" onOpen={onOpen} {...props} />
    </GameStoreContext.Provider>,
  );
  return { store, sent, onOpen, view };
}

describe('pet HUD', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows her pet's picture and name, opens its care board, and names it in the world once the game is up", async () => {
    const { store, sent, onOpen } = renderHud();
    expect(await screen.findByText('Bông')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Chăm sóc thú cưng' }));
    expect(onOpen).toHaveBeenCalled();
    act(() => store.emit({ type: 'ready' }));
    expect(sent).toContainEqual({ type: 'pet-name', name: 'Bông' });
  });

  it('takes a name picked since over the one it read', async () => {
    renderHud({ renamed: 'Mochi' });
    expect(await screen.findByText('Mochi')).toBeTruthy();
  });

  it('offers a sniff only while there is something to find, then waits', async () => {
    const { store, sent } = renderHud();
    await screen.findByText('Bông');
    expect(screen.queryByRole('button', { name: /đánh hơi/i })).toBeNull();
    act(() => store.emit({ type: 'pet-sniff', available: true, wait: 0 }));
    fireEvent.click(screen.getByRole('button', { name: 'Thú cưng đánh hơi tìm đồ' }));
    expect(sent).toContainEqual({ type: 'pet-sniff' });
    act(() => store.emit({ type: 'pet-sniff', available: true, wait: 12 }));
    expect((screen.getByRole('button', { name: 'Thú cưng đánh hơi tìm đồ' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Chờ 12 giây')).toBeTruthy();
  });

  it('steps aside while a screen covers the game', () => {
    const { view } = renderHud({ hidden: true });
    expect(view.container.querySelector('[data-id="hud-pet"]')).toBeNull();
  });
});
