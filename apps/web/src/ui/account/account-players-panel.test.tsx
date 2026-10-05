import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlayerDto } from '@miu/schema/account';
import type { PlayerProgressDto } from '@miu/schema/progress';
import { AccountProvider } from './account-context';
import { AccountPlayersPanel } from './account-players-panel';

const EXTRA: PlayerDto = { id: '3b0e8e0c-6f1a-4b8e-9a53-1f1c2a3b4c5d', displayName: 'Thỏ Bông', species: 'rabbit', language: 'vi', primary: false, onlineEnabled: true, botsEnabled: true };
const PROGRESS: PlayerProgressDto = {
  subjects: [],
  strong: [],
  weak: [],
  suggestions: [],
  weeks: ['2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05'].map((weekStart) => ({ weekStart, minutes: 5 })),
  counts: { playerLevel: 2, lessonsDone: 4, lessonsTotal: 70, threeStars: 1, minigameRuns: 0, regionsComplete: 0, collectibles: 0 },
};

type Handler = (body: unknown) => { status: number; body?: unknown };

function stubApi(routes: Record<string, Handler>) {
  const calls: Array<{ key: string; body: unknown }> = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const key = `${init?.method ?? 'GET'} ${url}`;
      const body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ key, body });
      const out = routes[key]?.(body) ?? { status: 404, body: { error: 'not-found' } };
      return new Response(out.status === 204 ? null : JSON.stringify(out.body), { status: out.status });
    }),
  );
  return calls;
}

function renderPanel(): void {
  render(
    <MemoryRouter>
      <AccountProvider>
        <AccountPlayersPanel players={[EXTRA]} />
      </AccountProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the account owner’s card per player', () => {
  it('opens on the player’s learning progress, read for that player', async () => {
    const calls = stubApi({ [`GET /api/players/${EXTRA.id}/learning-progress`]: () => ({ status: 200, body: PROGRESS }) });
    renderPanel();
    fireEvent.click(document.querySelector(`[data-id="player-care-toggle-${EXTRA.id}"]`) as HTMLElement);
    expect(await screen.findByText('Bài đã học: 4/70')).toBeTruthy();
    expect(calls.map((c) => c.key)).toContain(`GET /api/players/${EXTRA.id}/learning-progress`);
    // The owner's view does not jump into the game as that player.
    expect(document.querySelector('[data-id^="player-progress-"][data-id*="-play-"]')).toBeNull();
  });

  it('switches the player’s online play off for her', async () => {
    const calls = stubApi({
      [`GET /api/players/${EXTRA.id}/learning-progress`]: () => ({ status: 200, body: PROGRESS }),
      [`PATCH /api/players/${EXTRA.id}/settings`]: (body) => ({ status: 200, body: { onlineEnabled: true, botsEnabled: true, ...(body as object) } }),
    });
    renderPanel();
    fireEvent.click(document.querySelector(`[data-id="player-care-toggle-${EXTRA.id}"]`) as HTMLElement);
    fireEvent.click(await screen.findByRole('tab', { name: 'Chơi online' }));
    fireEvent.click(document.querySelector(`[data-id="player-care-onlineEnabled-${EXTRA.id}-off"]`) as HTMLElement);
    await waitFor(() => expect(document.querySelector(`[data-id="player-care-onlineEnabled-${EXTRA.id}-off"]`)?.getAttribute('aria-checked')).toBe('true'));
    expect(calls.find((c) => c.key.startsWith('PATCH'))?.body).toEqual({ onlineEnabled: false });
  });
});
