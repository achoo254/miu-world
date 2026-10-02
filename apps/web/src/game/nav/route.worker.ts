// Web Worker: finds routes to quest targets (route-service.ts) off the main thread, so reading the
// regions on the way and searching them never stalls the game.
import '../../zod-config';
import type { RouteQuery } from './route-search';
import { createRouteService, type RouteServiceInit, type RouteServiceResult } from './route-service';

export type RouteRequest = { type: 'init'; init: RouteServiceInit } | { type: 'find'; id: number; query: RouteQuery };
export type RouteReply = { type: 'route'; id: number; result: RouteServiceResult };

declare const self: DedicatedWorkerGlobalScope;

let service: ReturnType<typeof createRouteService> | null = null;

self.onmessage = (event: MessageEvent<RouteRequest>) => {
  const request = event.data;
  if (request.type === 'init') {
    service = createRouteService(request.init);
    return;
  }
  const reply = (result: RouteServiceResult): void => self.postMessage({ type: 'route', id: request.id, result } satisfies RouteReply);
  if (!service) return reply({ ok: false, reason: 'load-failed' });
  service.find(request.query).then(reply, () => reply({ ok: false, reason: 'load-failed' }));
};
