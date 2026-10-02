// The game's handle on route finding: the route worker, or the same service on the main thread when
// module workers are not available.
import type { RouteQuery } from './route-search';
import { createRouteService, type RouteServiceInit, type RouteServiceResult } from './route-service';
import type { RouteReply, RouteRequest } from './route.worker';

export interface RouteFinder {
  find(query: RouteQuery): Promise<RouteServiceResult>;
  dispose(): void;
}

export function createRouteFinder(init: RouteServiceInit): RouteFinder {
  const worker = ((): Worker | null => {
    try {
      return new Worker(new URL('./route.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      return null;
    }
  })();
  if (!worker) {
    const service = createRouteService(init);
    return { find: (query) => service.find(query), dispose: () => undefined };
  }
  const live = worker;
  const waiting = new Map<number, (result: RouteServiceResult) => void>();
  let nextId = 1;
  live.onmessage = (event: MessageEvent<RouteReply>) => {
    const done = waiting.get(event.data.id);
    waiting.delete(event.data.id);
    done?.(event.data.result);
  };
  live.onerror = () => {
    for (const done of waiting.values()) done({ ok: false, reason: 'load-failed' });
    waiting.clear();
  };
  live.postMessage({ type: 'init', init } satisfies RouteRequest);
  return {
    find: (query) =>
      new Promise((resolve) => {
        const id = nextId++;
        waiting.set(id, resolve);
        live.postMessage({ type: 'find', id, query } satisfies RouteRequest);
      }),
    dispose: () => {
      live.terminate();
      for (const done of waiting.values()) done({ ok: false, reason: 'load-failed' });
      waiting.clear();
    },
  };
}
