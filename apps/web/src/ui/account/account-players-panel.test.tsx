import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PlayerDto } from '@miu/schema/account';
import type { PlayerProgressDto } from '@miu/schema/progress';
import { AccountProvider } from './account-context';
import { AccountPlayersPanel } from './account-players-panel';

const EXTRA: PlayerDto = { id: '3b0e8e0c-6f1a-4b8e-9a53-1f1c2a3b4c5d', displayName: 'Thỏ Bông', species: 'rabbit', language: 'vi', primary: false, botsEnabled: true, voiceChatAllowed: true, onlineAllowed: true };
const PROGRESS: PlayerProgressDto = {
  subjects: [],
  strong: [],
  weak: [],
  suggestions: [],
  weeks: ['2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05'].map((weekStart) => ({ weekStart, minutes: 5 })),
  counts: { playerLevel: 2, lessonsDone: 4, lessonsTotal: 70, threeStars: 1, minigameRuns: 0, regionsComplete: 0, collectibles: 0 },
};

type Handler = (body: unknown) => { status: number; body?: unknown };

/** The account as the server reads it: with a PIN unless `pinSet` says otherwise. */
const me = (pinSet = true): Handler => () => ({
  status: 200,
  body: { parent: { id: '1b0e8e0c-6f1a-4b8e-9a53-1f1c2a3b4c5d', email: 'p@example.vn' }, consentAccepted: true, activePlayerId: null, players: [{ id: EXTRA.id, displayName: EXTRA.displayName, primary: false }], parentGateOpen: true, pinLocked: false, pinSet },
});

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

  it('switches the player’s companion bots off for her', async () => {
    const calls = stubApi({
      [`GET /api/players/${EXTRA.id}/learning-progress`]: () => ({ status: 200, body: PROGRESS }),
      [`PATCH /api/players/${EXTRA.id}/settings`]: (body) => ({ status: 200, body: { botsEnabled: true, voiceChatAllowed: true, onlineAllowed: true, ...(body as object) } }),
    });
    renderPanel();
    fireEvent.click(document.querySelector(`[data-id="player-care-toggle-${EXTRA.id}"]`) as HTMLElement);
    fireEvent.click(await screen.findByRole('tab', { name: 'Chơi online' }));
    fireEvent.click(document.querySelector(`[data-id="player-care-botsEnabled-${EXTRA.id}-off"]`) as HTMLElement);
    await waitFor(() => expect(document.querySelector(`[data-id="player-care-botsEnabled-${EXTRA.id}-off"]`)?.getAttribute('aria-checked')).toBe('true'));
    expect(calls.find((c) => c.key.startsWith('PATCH'))?.body).toEqual({ botsEnabled: false });
  });

  it('turns the player’s voice chat and online play off, each on its own, both on by default', async () => {
    const calls = stubApi({
      'GET /api/auth/me': me(),
      [`GET /api/players/${EXTRA.id}/learning-progress`]: () => ({ status: 200, body: PROGRESS }),
      [`PATCH /api/players/${EXTRA.id}/settings`]: (body) => ({ status: 200, body: { botsEnabled: true, voiceChatAllowed: true, onlineAllowed: true, ...(body as object) } }),
    });
    renderPanel();
    fireEvent.click(document.querySelector(`[data-id="player-care-toggle-${EXTRA.id}"]`) as HTMLElement);
    fireEvent.click(await screen.findByRole('tab', { name: 'Chơi online' }));
    const radio = (key: string, on: 'on' | 'off') => document.querySelector(`[data-id="player-care-${key}-${EXTRA.id}-${on}"]`) as HTMLElement;
    await waitFor(() => expect((radio('voiceChatAllowed', 'off') as HTMLButtonElement).disabled).toBe(false));
    expect(radio('voiceChatAllowed', 'on').getAttribute('aria-checked')).toBe('true');
    expect(radio('onlineAllowed', 'on').getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('radiogroup', { name: 'Nói chuyện bằng giọng' })).toBeTruthy();
    fireEvent.click(radio('voiceChatAllowed', 'off'));
    await waitFor(() => expect(radio('voiceChatAllowed', 'off').getAttribute('aria-checked')).toBe('true'));
    fireEvent.click(radio('onlineAllowed', 'off'));
    await waitFor(() => expect(radio('onlineAllowed', 'off').getAttribute('aria-checked')).toBe('true'));
    expect(calls.filter((c) => c.key.startsWith('PATCH')).map((c) => c.body)).toEqual([{ voiceChatAllowed: false }, { onlineAllowed: false }]);
  });

  it('without a PIN, keeps the online and voice switches as they are and asks the owner to set a PIN first', async () => {
    const calls = stubApi({
      'GET /api/auth/me': me(false),
      [`GET /api/players/${EXTRA.id}/learning-progress`]: () => ({ status: 200, body: PROGRESS }),
    });
    renderPanel();
    fireEvent.click(document.querySelector(`[data-id="player-care-toggle-${EXTRA.id}"]`) as HTMLElement);
    fireEvent.click(await screen.findByRole('tab', { name: 'Chơi online' }));
    const link = await screen.findByRole('link', { name: 'Đặt mã PIN' });
    expect(link.getAttribute('href')).toBe('/set-pin');
    for (const key of ['onlineAllowed', 'voiceChatAllowed']) {
      const off = document.querySelector(`[data-id="player-care-${key}-${EXTRA.id}-off"]`) as HTMLButtonElement;
      expect(off.disabled).toBe(true);
      fireEvent.click(off);
    }
    // The companion bot switch is the player's own: it still works without a PIN.
    expect((document.querySelector(`[data-id="player-care-botsEnabled-${EXTRA.id}-off"]`) as HTMLButtonElement).disabled).toBe(false);
    expect(calls.some((c) => c.key.startsWith('PATCH'))).toBe(false);
  });
});
