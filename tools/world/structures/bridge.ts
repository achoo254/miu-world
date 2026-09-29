// Wooden bridge across the stream: plank deck along z, log posts and plank rails on both sides.
import { put, type WorldWriter } from './world-writer';

export interface BridgeBlocks {
  planks: number;
  log: number;
  water: number;
}

export interface BridgeSpan {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  deckY: number;
}

export function placeBridge(world: WorldWriter, span: BridgeSpan, blocks: BridgeBlocks): void {
  const { x0, x1, z0, z1, deckY } = span;
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) {
      put(world, x, deckY, z, blocks.planks);
      for (let y = deckY + 1; y <= deckY + 3; y++) put(world, x, y, z, 0);
    }
    for (const x of [x0 - 1, x1 + 1]) {
      put(world, x, deckY, z, blocks.log);
      const post = z === z0 || z === z1 || (z - z0) % 3 === 0;
      put(world, x, deckY + 1, z, post ? blocks.log : blocks.planks);
    }
  }
  // Pillars down to the river bed under both rails.
  for (const z of [z0 + 1, z1 - 1]) {
    for (const x of [x0 - 1, x1 + 1]) {
      for (let y = deckY - 1; y > 0; y--) {
        const id = world.get(x, y, z);
        if (id !== 0 && id !== blocks.water) break;
        put(world, x, y, z, blocks.log);
      }
    }
  }
}
