import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PetBond, PetBondChange, PetCareStatusResponse } from '@miu/schema/pet-care';
import { createGameStore, type GameCommand, type GameStore } from '../../game-bridge/game-store';
import { GameStoreContext } from '../../game-bridge/use-game-state';
import { PetCarePanel } from './pet-care-panel';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const BOND: PetBond = {
  name: null,
  stats: { happiness: 85, fullness: 70, cleanliness: 90 },
  level: 1,
  xp: 35,
  levelXp: 0,
  nextLevelXp: 40,
  tricks: ['sit'],
  gear: [],
};

interface Calls {
  posts: Array<{ url: string; body: unknown }>;
}

function mockApi(status: PetCareStatusResponse, answers: Record<string, unknown> = {}, owned: Record<string, number> = {}): Calls {
  const calls: Calls = { posts: [] };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (method === 'GET' && url.endsWith('/api/character/pet/care')) return json(status);
      if (method === 'GET' && url.endsWith('/api/shop')) return json({ coins: 0, level: 1, owned, items: [] });
      const body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.posts.push({ url: `${method} ${url}`, body });
      const answer = answers[`${method} ${url.replace(/^.*\/api/, '')}`];
      return answer === undefined ? json({ error: 'not-found' }, 404) : json(answer);
    }),
  );
  return calls;
}

function renderPanel(): { store: GameStore; sent: GameCommand[]; onClose: () => void } {
  const store = createGameStore();
  const sent: GameCommand[] = [];
  store.onCommand((c) => sent.push(c));
  const onClose = vi.fn();
  render(
    <GameStoreContext.Provider value={store}>
      <PetCarePanel onClose={onClose} />
    </GameStoreContext.Provider>,
  );
  return { store, sent, onClose };
}

describe('pet care board', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('says how to take a pet along when there is none', async () => {
    mockApi({ hasPet: false, petId: null });
    renderPanel();
    expect(await screen.findByText('Chưa có thú cưng đi cùng')).toBeTruthy();
  });

  it("shows the pet's own picture, name, level, needs and a line from it", async () => {
    mockApi({ hasPet: true, petId: 'meo-xam', bond: { ...BOND, name: 'Bông' } });
    const { sent } = renderPanel();
    expect(await screen.findByText('Chăm sóc Bông')).toBeTruthy();
    expect(screen.getByAltText('Bông').getAttribute('src')).toContain('generated/pets/meo-xam.png');
    expect(screen.getByText('Cấp 1')).toBeTruthy();
    expect(screen.getByText('85%')).toBeTruthy();
    expect(screen.getByText('70%')).toBeTruthy();
    expect(screen.getByText('90%')).toBeTruthy();
    expect(document.querySelector('[data-id="pet-care-line"]')?.textContent).toMatch(/Bông/);
    // The game shows the name over the pet.
    expect(sent).toContainEqual({ type: 'pet-name', name: 'Bông' });
  });

  it('plays a scene in the world for a care button, folds while it plays, then tells what it brought', async () => {
    const change: PetBondChange = { bond: { ...BOND, xp: 45, level: 2, levelXp: 40, nextLevelXp: 100, tricks: ['sit', 'spin'], stats: { ...BOND.stats, fullness: 100 } }, xpGained: 10, levelUp: true, unlocked: ['spin'] };
    const calls = mockApi({ hasPet: true, petId: 'meo-xam', bond: BOND }, { 'POST /character/pet/care': change });
    const { store, sent } = renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /Cho ăn/ }));
    expect(sent).toContainEqual({ type: 'pet-care', action: 'feed' });
    expect(calls.posts).toEqual([{ url: 'POST /api/character/pet/care', body: { action: 'feed' } }]);
    act(() => store.emit({ type: 'pet-scene', scene: 'care:feed' }));
    expect(await screen.findByText('Mèo xám đang ăn…')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => store.emit({ type: 'pet-scene', scene: null }));
    const news = await screen.findByText('+10 thân thiết');
    expect(news).toBeTruthy();
    expect(screen.getByText('Mèo xám lên cấp 2!')).toBeTruthy();
    expect(screen.getByText('Học được trò mới: Xoay vòng')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('every care button asks for its own scene', async () => {
    mockApi({ hasPet: true, petId: 'meo-xam', bond: BOND }, { 'POST /character/pet/care': { bond: BOND, xpGained: 0, levelUp: false, unlocked: [] } });
    const { store, sent } = renderPanel();
    for (const [label, action] of [
      ['Cho ăn', 'feed'],
      ['Vuốt ve', 'pet'],
      ['Tắm', 'bath'],
      ['Ném bóng', 'play'],
      ['Ngủ trưa', 'nap'],
    ] as const) {
      fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^${label}$`) }));
      expect(sent.at(-1)).toEqual({ type: 'pet-care', action });
      act(() => store.emit({ type: 'pet-scene', scene: `care:${action}` }));
      act(() => store.emit({ type: 'pet-scene', scene: null }));
    }
  });

  it('calls only the tricks its level opened', async () => {
    const calls = mockApi({ hasPet: true, petId: 'meo-xam', bond: BOND }, { 'POST /character/pet/trick': { bond: BOND } });
    const { sent } = renderPanel();
    fireEvent.click(await screen.findByRole('tab', { name: /Làm trò/ }));
    const spin = screen.getByRole('button', { name: /Xoay vòng/ }) as HTMLButtonElement;
    expect(spin.disabled).toBe(true);
    expect(within(spin).getByText('Mở ở cấp 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Ngồi$/ }));
    await vi.waitFor(() => expect(sent).toContainEqual({ type: 'pet-trick', trick: 'sit' }));
    expect(calls.posts).toEqual([{ url: 'POST /api/character/pet/trick', body: { trick: 'sit' } }]);
  });

  it('names the pet from the list', async () => {
    const calls = mockApi({ hasPet: true, petId: 'meo-xam', bond: BOND }, { 'PUT /character/pet/name': { bond: { ...BOND, name: 'Mochi' } } });
    const { sent } = renderPanel();
    fireEvent.click(await screen.findByRole('tab', { name: /Đặt tên/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Mochi' }));
    expect(await screen.findByText('Từ nay gọi là Mochi nhé!')).toBeTruthy();
    expect(calls.posts).toEqual([{ url: 'PUT /api/character/pet/name', body: { name: 'Mochi' } }]);
    expect(sent).toContainEqual({ type: 'pet-name', name: 'Mochi' });
    expect(screen.getByText('Chăm sóc Mochi')).toBeTruthy();
  });

  it('dresses the pet in gear she bought, one per place', async () => {
    const calls = mockApi({ hasPet: true, petId: 'meo-xam', bond: { ...BOND, gear: ['pet-bow-pink'] } }, { 'PUT /character/pet/gear': { bond: { ...BOND, gear: ['pet-crown'] } } }, { 'pet-bow-pink': 1, 'pet-crown': 1, 'them-mot-tim': 2 });
    const { sent } = renderPanel();
    fireEvent.click(await screen.findByRole('tab', { name: /Phụ kiện/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Vương miện nhỏ/ }));
    await vi.waitFor(() => expect(sent).toContainEqual({ type: 'pet-gear', gear: ['pet-crown'] }));
    // The crown takes the bow's place on its head.
    expect(calls.posts).toEqual([{ url: 'PUT /api/character/pet/gear', body: { gear: ['pet-crown'] } }]);
  });

  it('says where to buy gear when she has none', async () => {
    mockApi({ hasPet: true, petId: 'meo-xam', bond: BOND });
    renderPanel();
    fireEvent.click(await screen.findByRole('tab', { name: /Phụ kiện/ }));
    expect(await screen.findByText(/Ghé cửa hàng ở Trung tâm/)).toBeTruthy();
  });
});
