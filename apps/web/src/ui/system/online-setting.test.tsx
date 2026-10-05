import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { playerSettings } from '../../game-bridge/player-settings';
import { OnlineSettings } from './online-setting';

type Call = { method: string; url: string; body: unknown };

/** The server's copy of her switches, behind `fetch`. */
function stubServer(start = { onlineEnabled: true, botsEnabled: true }) {
  let saved = { ...start };
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      const body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ method, url, body });
      if (method === 'PUT') saved = { ...saved, ...(body as object) };
      return new Response(JSON.stringify(saved), { status: 200 });
    }),
  );
  return calls;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe('online settings', () => {
  it('shows her switches from the server and saves a change there', async () => {
    const calls = stubServer();
    const seen: boolean[] = [];
    const stop = playerSettings.subscribe((s) => seen.push(s.onlineEnabled));
    render(<OnlineSettings dataId="pause" />);
    await waitFor(() => expect(document.querySelector('[data-id="pause-online-on"]')?.getAttribute('aria-checked')).toBe('true'));
    fireEvent.click(document.querySelector('[data-id="pause-online-off"]') as HTMLElement);
    await waitFor(() => expect(document.querySelector('[data-id="pause-online-off"]')?.getAttribute('aria-checked')).toBe('true'));
    expect(calls.at(-1)).toEqual({ method: 'PUT', url: '/api/player-settings', body: { onlineEnabled: false } });
    // The game's online session hears it.
    expect(seen.at(-1)).toBe(false);
    stop();
  });

  it('moves a bot switch turned off on this device to the server once', async () => {
    window.localStorage.setItem('miu.bots.enabled', 'false');
    const calls = stubServer();
    render(<OnlineSettings dataId="home-settings" />);
    await waitFor(() => expect(document.querySelector('[data-id="home-settings-bots-off"]')?.getAttribute('aria-checked')).toBe('true'));
    expect(calls.some((c) => c.method === 'PUT' && JSON.stringify(c.body) === '{"botsEnabled":false}')).toBe(true);
    expect(window.localStorage.getItem('miu.bots.enabled')).toBeNull();
  });

  it('says so when a change cannot be saved', async () => {
    stubServer();
    render(<OnlineSettings dataId="pause" />);
    await screen.findAllByRole('radiogroup');
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'internal' }), { status: 500 })));
    fireEvent.click(document.querySelector('[data-id="pause-bots-off"]') as HTMLElement);
    expect(await screen.findByRole('alert')).toBeTruthy();
  });
});
