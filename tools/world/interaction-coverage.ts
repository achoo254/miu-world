// `pnpm world:interactions [<map>…]`: on the generated maps' committed entities (every style of the home's
// pieces counted), which placed models each everyday interaction matches, the models whose name says they
// could be used but that no interaction matches, and what an interaction needs of a model that the catalogue
// or the model lacks: seats to sit on, a mattress to lie on, a screen to light, moving parts to open, a swing's
// seat and pivot as its model has them. The catalogue test (interaction-catalogue.test.ts) holds every map to
// the last list being empty.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { everyDecorProp } from '../../packages/voxel/src/home-decor';
import type { ModelCatalog } from '../../packages/voxel/src/model-catalog';
import type { WorldEntities } from '../../packages/voxel/src/world-entities';
import { POSE_BEHAVIOURS } from '../../apps/web/src/game/interact/interaction-poses';
import { SWING_AMPLITUDE } from '../../apps/web/src/game/interact/interaction-geometry';
import { matchInteraction, modelBaseName, nameWords } from '../../apps/web/src/game/interact/object-interaction-registry';
import { ASSETS_DIR } from '../assets/asset-lib';
import { readBoxProps } from '../assets/build-box-props';
import { loadModelCatalog } from './model-catalog';

/** Words in a model's name that say a child could use it. */
const USABLE_WORDS = ['chair', 'bench', 'sofa', 'pouf', 'poufs', 'seat', 'stool', 'bed', 'lamp', 'lantern', 'television', 'computer', 'door', 'sink', 'stove', 'fridge', 'oven', 'bath', 'bathtub', 'shower', 'toilet', 'wardrobe', 'cabinet', 'desk', 'swing', 'slide', 'seesaw', 'piano', 'radio', 'clock', 'mailbox', 'fan', 'bucket', 'well', 'toy', 'ball', 'globe', 'hammock'];

/**
 * Models whose name says "usable" but that are scenery on purpose, and why: what a child does there is already
 * another object's interaction, or the thing is out of reach or only part of a building.
 */
export const NOT_INTERACTIVE: Readonly<Record<string, string>> = {
  kitchenCabinet: 'a kitchen counter: the sink and the stove beside it are what she uses',
  kitchenCabinetUpper: 'a wall cupboard out of her reach',
  cabinetBed: 'a bedside table: the bed beside it is what she uses',
  cabinetTelevision: 'the television stand: the television on it is what she uses',
  'ncb-trophy-cabinet': 'the display cabinet of the trophy room: its list opens before it (an interactable of its own)',
  'xma-hanging-lantern': 'a lantern hung out of her reach',
  'nt-hanging-lantern': 'a lantern hung out of her reach',
  'tt-lantern-string': 'a string of lanterns over the square, out of reach',
  'cp-hang-lantern': 'a lantern hung over the market stalls, out of her reach',
  'kr-hanging-lantern': 'a lantern hung in the trees, out of her reach',
  'ntu-wall-lantern': 'a lantern on the wall, out of her reach',
  'tv-wall-lantern': 'a lantern on the wall, out of her reach',
  'ld-wall-lantern': 'a lantern on the wall, out of her reach',
};

export interface MapCoverage {
  map: string;
  /** Interaction id → model file name → how many are placed. */
  matched: Record<string, Record<string, number>>;
  /** Usable-looking models no interaction matches (and not listed as scenery on purpose) → how many. */
  unmatched: Record<string, number>;
  /** What an interaction needs of a placed model that is missing (one line each). */
  missing: string[];
}

type Prop = WorldEntities['props'][number];

/** What the matched interaction needs of a model, missing in the catalogue or the model (empty when complete). */
export function needsOf(prop: Prop, catalog: ModelCatalog, parts: (model: string) => Record<string, { pivot: readonly number[]; angle: number }> | null): string[] {
  const def = matchInteraction(prop.model, prop.slot);
  if (!def) return [];
  const entry = catalog.models[prop.model];
  const place = POSE_BEHAVIOURS[def.pose].place;
  const out: string[] = [];
  const name = `${def.id} on ${prop.model}`;
  if (place === 'seat' && !entry?.seats) out.push(`${name}: no seats`);
  if (place === 'lie' && !entry?.lie) out.push(`${name}: no mattress (lie)`);
  if (place === 'inside' && !entry?.stand) out.push(`${name}: no standing spot (stand)`);
  if ((place === 'front' || def.effect?.kind === 'screen') && !entry?.screen) out.push(`${name}: no screen`);
  const kind = def.effect?.kind;
  if (kind === 'open' || kind === 'door' || kind === 'sway') {
    const own = parts(prop.model);
    if (!own || Object.keys(own).length === 0) out.push(`${name}: no moving parts`);
  }
  for (const seat of entry?.seats ?? []) {
    if (!seat.part) continue;
    const part = parts(prop.model)?.[seat.part];
    if (!part) out.push(`${name}: seat on part ${seat.part}, which the model does not have`);
    else {
      if (!seat.pivot || seat.pivot.some((v, i) => Math.abs(v - (part.pivot[i] ?? Number.NaN)) > 1e-6)) out.push(`${name}: seat pivot differs from part ${seat.part}'s`);
      if (Math.abs((part.angle * Math.PI) / 180 - SWING_AMPLITUDE) > 1e-6) out.push(`${name}: part ${seat.part} swings ${part.angle}°, the game ${(SWING_AMPLITUDE * 180) / Math.PI}°`);
    }
  }
  return out;
}

/** Box props' moving parts by model path (`generated/box-props/<id>.glb`). */
export async function boxPropParts(): Promise<(model: string) => Record<string, { pivot: readonly number[]; angle: number }> | null> {
  const props = await readBoxProps();
  return (model) => {
    const m = /^generated\/box-props\/(.+)\.glb$/.exec(model);
    return (m && props[m[1] ?? '']?.parts) ?? null;
  };
}

export async function mapEntities(map: string): Promise<WorldEntities> {
  return JSON.parse(await readFile(path.join(ASSETS_DIR, 'generated/world', map, 'entities.json'), 'utf8')) as WorldEntities;
}

export async function interactionCoverage(map: string): Promise<MapCoverage> {
  const entities = await mapEntities(map);
  const catalog = await loadModelCatalog();
  const parts = await boxPropParts();
  const matched: MapCoverage['matched'] = {};
  const unmatched: MapCoverage['unmatched'] = {};
  const missing = new Set<string>();
  // Every style of every piece of the home, so no pick can bring a seat without its seat data.
  for (const prop of everyDecorProp(entities)) {
    const def = matchInteraction(prop.model, prop.slot);
    const base = modelBaseName(prop.model);
    if (def) {
      const models = (matched[def.id] ??= {});
      models[base] = (models[base] ?? 0) + 1;
      for (const need of needsOf(prop, catalog, parts)) missing.add(need);
    } else if (!(base in NOT_INTERACTIVE) && nameWords(base).split('-').some((w) => USABLE_WORDS.includes(w))) {
      unmatched[base] = (unmatched[base] ?? 0) + 1;
    }
  }
  return { map, matched, unmatched, missing: [...missing].sort() };
}

export async function generatedMaps(): Promise<string[]> {
  return (await readdir(path.join(ASSETS_DIR, 'generated/world'), { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort();
}

async function main(): Promise<void> {
  const maps = process.argv.slice(2);
  for (const map of maps.length > 0 ? maps : await generatedMaps()) {
    const c = await interactionCoverage(map);
    console.log(`== ${map}: ${Object.keys(c.matched).length} interactions, ${Object.values(c.matched).reduce((n, m) => n + Object.values(m).reduce((a, b) => a + b, 0), 0)} objects`);
    for (const [id, models] of Object.entries(c.matched).sort(([a], [b]) => a.localeCompare(b))) console.log(`  ${id}: ${Object.entries(models).map(([m, n]) => `${m} ×${n}`).join(', ')}`);
    if (Object.keys(c.unmatched).length > 0) console.log(`  looks usable, no interaction: ${Object.entries(c.unmatched).map(([m, n]) => `${m} ×${n}`).join(', ')}`);
    for (const line of c.missing) console.log(`  MISSING ${line}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
