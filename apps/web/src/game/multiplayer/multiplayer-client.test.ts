import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MultiplayerClient } from './multiplayer-client';

/** A WebSocket that never opens: the server is out of reach. */
class UnreachableSocket {
  static readonly OPEN = 1;
  readonly readyState = 3;
  onopen: (() => void) | null = null;
  onmessage: (() => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  constructor() {
    queueMicrotask(() => this.onclose?.({ code: 1006 }));
  }
  close(): void {}
  send(): void {}
}

function setVisibility(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

const start = { mapId: 'trung-tam', x: 0, y: 0, z: 0, yaw: 0 };

describe('multiplayer client back from the background', () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ticket: 't'.repeat(43) }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('WebSocket', UnreachableSocket);
    fetchMock.mockClear();
  });
  afterEach(() => {
    setVisibility('visible');
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('reconnects at once when the game shows again, instead of waiting out its back-off', async () => {
    const client = new MultiplayerClient(start, { onMessage: () => undefined });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(0); // the socket closes unopened: a reconnect is scheduled
    setVisibility('hidden');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    setVisibility('visible');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    client.dispose();
  });

  it('does nothing after it was disposed', async () => {
    const client = new MultiplayerClient(start, { onMessage: () => undefined });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(0);
    client.dispose();
    setVisibility('visible');
    await vi.advanceTimersByTimeAsync(120_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
