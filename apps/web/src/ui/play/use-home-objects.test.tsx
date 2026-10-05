import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGameStore } from '../../game-bridge/game-store';
import { useHomeObjects } from './use-home-objects';

type Call = { method: string; body: unknown };

/** The server behind `fetch`: what it keeps, every call, and saves that answer only when let go. */
function stubServer(start: Record<string, true> = {}) {
  let kept: Record<string, unknown> = { ...start };
  const calls: Call[] = [];
  const held: Array<() => void> = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      const body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ method, body });
      if (method === 'PUT') {
        await new Promise<void>((resolve) => held.push(resolve));
        kept = (body as { states: Record<string, unknown> }).states;
      }
      return new Response(JSON.stringify({ states: kept }), { status: 200 });
    }),
  );
  return { calls, release: () => held.shift()?.(), kept: () => kept };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('her home objects on the server', () => {
  it('reads them at home only, and saves the latest set in order after a burst of switches', async () => {
    const server = stubServer({ 'lamp-toggle@lamp#0': true });
    const store = createGameStore();
    const { result, rerender } = renderHook(({ home }) => useHomeObjects(home, store), { initialProps: { home: false } });
    expect(result.current).toBeNull();
    expect(server.calls).toEqual([]);
    rerender({ home: true });
    await waitFor(() => expect(result.current).toEqual({ 'lamp-toggle@lamp#0': true }));

    vi.useFakeTimers();
    act(() => store.emit({ type: 'object-states', states: { 'lamp-toggle@lamp#0': true, 'tv-watch@1,2,3': true } }));
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    act(() => store.emit({ type: 'object-states', states: { 'tv-watch@1,2,3': true } }));
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    vi.useRealTimers();
    // The first save is still on its way: the second waits for it, so the server ends with the newest set.
    await waitFor(() => expect(server.calls.filter((c) => c.method === 'PUT')).toHaveLength(1));
    server.release();
    await waitFor(() => expect(server.calls.filter((c) => c.method === 'PUT')).toHaveLength(2));
    server.release();
    await waitFor(() => expect(server.kept()).toEqual({ 'tv-watch@1,2,3': true }));
    expect(result.current).toEqual({ 'tv-watch@1,2,3': true });
  });

  it('saves a switch at once when the page goes away', async () => {
    const server = stubServer();
    const store = createGameStore();
    const { result, unmount } = renderHook(() => useHomeObjects(true, store));
    await waitFor(() => expect(result.current).toEqual({}));
    act(() => store.emit({ type: 'object-states', states: { 'lamp-toggle@lamp#0': true } }));
    unmount();
    await waitFor(() => expect(server.calls.at(-1)).toEqual({ method: 'PUT', body: { states: { 'lamp-toggle@lamp#0': true } } }));
    server.release();
  });
});
