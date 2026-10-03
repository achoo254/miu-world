// The child's home is written in every style of content/home/decor.json (mock panels 11 and 12): each slot
// that places models has its spots on the map with the default standing there, and every other style's
// models in the catalogue's order; each slot that paints blocks has every other style's colours for the
// parts the house is built with. Reads the committed map (pnpm world:nha-cua-be).
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { HomeDecorCatalog } from '../../packages/schema/src/home-decor';
import { blockTableSchema } from '../../packages/voxel/src/block-table';
import { decoratedProps } from '../../packages/voxel/src/home-decor';
import { worldEntitiesSchema } from '../../packages/voxel/src/world-entities';
import { ASSETS_DIR, REPO_ROOT } from '../assets/asset-lib';

const catalog = HomeDecorCatalog.parse(JSON.parse(await readFile(path.join(REPO_ROOT, 'content/home/decor.json'), 'utf8')));
const entities = worldEntitiesSchema.parse(JSON.parse(await readFile(path.join(ASSETS_DIR, 'generated/world/nha-cua-be/entities.json'), 'utf8')));
const blocks = new Map(blockTableSchema.parse(JSON.parse(await readFile(path.join(REPO_ROOT, 'content/blocks.json'), 'utf8'))).blocks.map((b) => [b.name, b.id]));

describe.each(catalog.slots.map((s) => [s.id, s] as const))('decor slot %s', (_id, slot) => {
  const own = slot.options.find((o) => o.id === slot.default);
  const others = slot.options.filter((o) => o.id !== slot.default);

  it('offers at least six styles', () => {
    expect(slot.options.length).toBeGreaterThanOrEqual(6);
  });

  if (own?.models) {
    it('stands its default at every spot, and writes every other style', () => {
      const spots = (entities.decorAnchors ?? []).filter((a) => a.slot === slot.id);
      expect(spots.length).toBeGreaterThan(0);
      const placed = entities.props.filter((p) => p.slot === slot.id);
      expect(placed).toHaveLength(spots.length);
      for (const p of placed) expect(own.models).toContain(p.model);
      for (const option of others) {
        const written = (entities.decorModels ?? []).filter((m) => m.slot === slot.id && m.option === option.id);
        expect(written.map((m) => m.model)).toEqual(option.models);
        for (const m of written) expect(m.turn).toBe(option.turn ?? 0);
        // Picked, every spot shows it and no default piece is left behind.
        const shown = decoratedProps(entities, { [slot.id]: option.id }).filter((p) => p.slot === slot.id);
        expect(shown).toHaveLength(spots.length);
        for (const p of shown) expect(option.models).toContain(p.model);
      }
    });
  } else {
    it('paints every other style over the blocks the house is built with', () => {
      for (const option of others) {
        const written = (entities.decorBlocks ?? []).filter((b) => b.slot === slot.id && b.option === option.id);
        const changed = Object.entries(option.blocks ?? {}).filter(([role, name]) => own?.blocks?.[role] !== name);
        expect(written.length).toBeGreaterThanOrEqual(changed.length);
        for (const [role, name] of changed) expect(written).toContainEqual(expect.objectContaining({ from: blocks.get(own?.blocks?.[role] ?? ''), to: blocks.get(name) }));
      }
    });
  }
});
