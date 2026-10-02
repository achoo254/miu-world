// Web Worker: builds the map's regions (the outer land generated from the seed, the core's files laid
// over it) off the main thread and sends each back as its raw blocks (transferred, not copied).
import '../../zod-config';
import { createRegionBuilder, type RegionBuilder, type RegionBuilderInit } from './region-builder';

export type RegionRequest = { type: 'init'; init: RegionBuilderInit } | { type: 'build'; rx: number; rz: number; core: Uint8Array | null };
export type RegionReply = { type: 'built'; rx: number; rz: number; data: Uint8Array } | { type: 'failed'; rx: number; rz: number; message: string };

declare const self: DedicatedWorkerGlobalScope;

let build: RegionBuilder | null = null;

self.onmessage = (event: MessageEvent<RegionRequest>) => {
  const request = event.data;
  if (request.type === 'init') {
    build = createRegionBuilder(request.init).build;
    return;
  }
  try {
    if (!build) throw new Error('region worker used before init');
    const region = build(request.rx, request.rz, request.core);
    const reply: RegionReply = { type: 'built', rx: request.rx, rz: request.rz, data: region.data };
    self.postMessage(reply, [region.data.buffer as ArrayBuffer]);
  } catch (err) {
    const reply: RegionReply = { type: 'failed', rx: request.rx, rz: request.rz, message: err instanceof Error ? err.message : String(err) };
    self.postMessage(reply);
  }
};
