import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountProvider } from '../account/account-context';
import { PROGRESS, questList } from '../player/test-fixtures';
import { PlayScreen } from './play-screen';

/** The three reads /play makes, answered like the server; `character` may fail to simulate the network. */
function playApi(character: () => Response = () => json({ species: 'cat', name: 'Mochi', equipped: [] })) {
  return vi.fn(async (url: string) => {
    if (url === '/api/character') return character();
    if (url === '/api/progress') return json(PROGRESS);
    if (url === '/api/quests') return json(questList(1));
    return json({ error: 'unauthenticated' }, 401);
  });
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

// jsdom has no WebGL; the runtime itself is covered by Playwright. Here: lifecycle under StrictMode.
const games = vi.hoisted(() => ({ live: 0, started: 0, stops: 0, resumes: 0 }));
vi.mock('../../game/game', () => ({
  Game: class {
    private alive = true;
    private readonly options: { store: { emit(e: { type: 'ready' }): void } };
    constructor(_host: HTMLElement, options: { store: { emit(e: { type: 'ready' }): void } }) {
      this.options = options;
    }
    async start() {
      games.started += 1;
      games.live += 1;
      this.options.store.emit({ type: 'ready' });
    }
    stop() {
      games.stops += 1;
    }
    resume() {
      games.resumes += 1;
    }
    dispose() {
      if (this.alive && games.started > 0) games.live -= 1;
      this.alive = false;
    }
  },
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('PlayScreen under React StrictMode', () => {
  it('ends with exactly one live game and none after unmount', async () => {
    vi.stubGlobal('fetch', playApi());
    const view = render(
      <StrictMode>
        <MemoryRouter>
          <AccountProvider>
            <PlayScreen />
          </AccountProvider>
        </MemoryRouter>
      </StrictMode>,
    );
    expect(await screen.findByRole('button', { name: /Menu/ })).toBeTruthy();
    await vi.waitFor(() => expect(games.started).toBeGreaterThanOrEqual(2)); // StrictMode mounted twice
    expect(games.live).toBe(1);
    view.unmount();
    expect(games.live).toBe(0);
  });

  it('stops the game while Pause is open and resumes it after', async () => {
    vi.stubGlobal('fetch', playApi());
    render(
      <MemoryRouter>
        <AccountProvider>
          <PlayScreen />
        </AccountProvider>
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: /Menu/ }));
    expect(screen.getByRole('dialog', { name: 'Tạm dừng' })).toBeTruthy();
    const stops = games.stops;
    expect(stops).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục chơi/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(games.resumes).toBeGreaterThan(0);
    // Esc opens it again.
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'Tạm dừng' })).toBeTruthy();
  });

  it('offers a retry when the network is down, and starts the game once it is back', async () => {
    let online = false;
    vi.stubGlobal(
      'fetch',
      playApi(() => {
        if (!online) throw new TypeError('Failed to fetch');
        return json({ species: 'cat', name: 'Mochi', equipped: [] });
      }),
    );
    const started = games.started;
    render(
      <MemoryRouter>
        <AccountProvider>
          <PlayScreen />
        </AccountProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('dialog', { name: 'Mất kết nối mạng' })).toBeTruthy();
    online = true;
    fireEvent.click(screen.getByRole('button', { name: 'Thử kết nối lại' }));
    await vi.waitFor(() => expect(games.started).toBeGreaterThan(started));
    expect(screen.queryByRole('dialog', { name: 'Mất kết nối mạng' })).toBeNull();
  });
});
