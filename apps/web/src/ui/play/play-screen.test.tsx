import { StrictMode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountProvider } from '../account/account-context';
import { PlayScreen } from './play-screen';

// jsdom has no WebGL; the runtime itself is covered by Playwright. Here: lifecycle under StrictMode.
const games = vi.hoisted(() => ({ live: 0, started: 0 }));
vi.mock('../../game/game', () => ({
  Game: class {
    private alive = true;
    async start() {
      games.started += 1;
      games.live += 1;
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
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url === '/api/character'
          ? new Response(JSON.stringify({ species: 'cat', name: 'Miu', equipped: [] }), { status: 200 })
          : new Response(JSON.stringify({ error: 'unauthenticated' }), { status: 401 }),
      ),
    );
    const view = render(
      <StrictMode>
        <MemoryRouter>
          <AccountProvider>
            <PlayScreen />
          </AccountProvider>
        </MemoryRouter>
      </StrictMode>,
    );
    expect(await screen.findByRole('link', { name: 'Thoát' })).toBeTruthy();
    await vi.waitFor(() => expect(games.started).toBeGreaterThanOrEqual(2)); // StrictMode mounted twice
    expect(games.live).toBe(1);
    view.unmount();
    expect(games.live).toBe(0);
  });
});
