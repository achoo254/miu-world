// Builds the quest things and small scenery no 3D pack has (cars, baskets, books, lotus, balloons, envelopes,
// tickets, rulers…) as block models from Fluent Emoji pictures. The most seen ones are modelled in code
// (prop-models-*.ts: a real car, a woven basket, an open book standing…); every other picture is extruded
// into a rounded block model, thicker toward its middle, in a few flat colours (prop-picture.ts). Each model
// keeps the height its old flat card had, in the picture's cells, so it stands as tall where the maps placed it.
// Catalogue: content/world/emoji-props.json; pictures: assets/packs/fluent-emoji/<version>/props/; output:
// assets/generated/props/<id>.glb (one mesh, vertex colours, one draw call). Same input, same bytes.
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { EmojiPropCatalog, type EmojiProp } from '../../packages/schema/src/world-target';
import { ASSETS_DIR, REPO_ROOT } from './asset-lib';
import { colorize, extrudePicture, flatten, gridFromImage, hexToRgb, sampler, type Profile, type PropGrid, type Rgb } from './prop-picture';
import { HOME_PROPS } from './prop-models-home';
import { NATURE_PROPS } from './prop-models-nature';
import { TOY_PROPS } from './prop-models-toys';
import { VEHICLE_PROPS } from './prop-models-vehicles';
import { meshFromVoxels, propGlb, type PropMesh, type PropModel } from './prop-voxels';
import { Grid } from './vehicle-voxel-grid';

/** Cells across the picture's longer side of the flat card each prop replaces: its height in them is the model's. */
export const CARD_GRID = 16;
/** Cells across the longer side of an extruded picture. */
export const EXTRUDE_GRID = 24;
/** Flat colours an extruded picture is cut to. */
const EXTRUDE_COLORS = 12;
/** Resolution and colours of the picture a model authored in code samples (painted balls, a framed canvas). */
const SAMPLE_GRID = 48;
const SAMPLE_COLORS = 12;
/** Triangles a prop may have: like a worn accessory, it is drawn hundreds of times on a map. */
export const TRIANGLE_BUDGET = 1500;

export const PROPS_DIR = path.join(ASSETS_DIR, 'generated/props');
const CATALOGUE = path.join(REPO_ROOT, 'content/world/emoji-props.json');

export const PROP_MODELS: ReadonlyMap<string, PropModel> = new Map([...VEHICLE_PROPS, ...TOY_PROPS, ...HOME_PROPS, ...NATURE_PROPS].map((m) => [m.emoji, m]));

/**
 * How an extruded picture is shaped (prop-picture.ts `Profile`; `round` when not listed): thin flat things
 * (paper, tickets, rulers, postcards) are boards, the things hung on walls stand proud of a flat back.
 */
const PROFILES: Readonly<Record<string, Profile>> = {
  envelope: 'slab',
  'page-facing-up': 'slab',
  'page-with-curl': 'slab',
  memo: 'slab',
  ticket: 'slab',
  'admission-tickets': 'slab',
  'card-index': 'slab',
  'bookmark-tabs': 'slab',
  'straight-ruler': 'slab',
  'triangular-ruler': 'slab',
  paperclip: 'slab',
  'classical-building': 'slab',
  'desert-island': 'slab',
  'sunrise-over-mountains': 'slab',
  placard: 'slab',
  'twelve-oclock': 'relief',
  calendar: 'relief',
  'spiral-calendar': 'relief',
  'tear-off-calendar': 'relief',
  door: 'relief',
  window: 'relief',
};

/** A model built in code: palette keys resolved, the `tinted` ones repainted for a colour variant. */
function modelColors(model: PropModel, prop: EmojiProp): (cell: string) => Rgb {
  return (cell) => {
    if (cell.startsWith('#')) return hexToRgb(cell);
    const hex = model.palette[cell];
    if (!hex) throw new Error(`${model.emoji}: colour ${cell} is not in its palette`);
    return prop.colorize && model.tinted.includes(cell) ? colorize(hexToRgb(hex), prop.colorize) : hexToRgb(hex);
  };
}

/** The prop's block model, fitted to its card's height; `built`: modelled in code or extruded from the picture. */
export function propMesh(png: Buffer, prop: EmojiProp): PropMesh & { built: 'code' | 'picture'; card: PropGrid } {
  const image = PNG.sync.read(png);
  const card = gridFromImage(image, CARD_GRID);
  const model = PROP_MODELS.get(prop.emoji);
  if (model) {
    const g = new Grid();
    model.build(g, sampler(flatten(gridFromImage(image, SAMPLE_GRID), model.pictureColors ?? SAMPLE_COLORS)));
    const mesh = meshFromVoxels(g, modelColors(model, prop), { height: card.height, anchor: model.anchor ?? 'centre' }, model.turn);
    return { ...mesh, built: 'code', card };
  }
  const profile = PROFILES[prop.emoji] ?? 'round';
  // A busy picture is cut coarser until it fits the triangle budget.
  let mesh: PropMesh | undefined;
  for (let cells = EXTRUDE_GRID; cells >= CARD_GRID && (!mesh || mesh.indices.length / 3 > TRIANGLE_BUDGET); cells -= 2) {
    const grid = gridFromImage(image, cells);
    const painted: PropGrid = prop.colorize ? { ...grid, cells: grid.cells.map((c) => (c && prop.colorize ? colorize(c, prop.colorize) : c)) } : grid;
    mesh = meshFromVoxels(extrudePicture(flatten(painted, EXTRUDE_COLORS), profile), hexToRgb, { height: card.height, anchor: profile === 'relief' ? 'wall' : 'centre' });
  }
  if (!mesh) throw new Error(`${prop.emoji}: no model`);
  return { ...mesh, built: 'picture', card };
}

export async function buildProp(png: Buffer, prop: EmojiProp): Promise<Uint8Array> {
  return propGlb(propMesh(png, prop));
}

async function main(): Promise<void> {
  const catalogue = EmojiPropCatalog.parse(JSON.parse(await readFile(CATALOGUE, 'utf8')));
  const [version] = await readdir(path.join(ASSETS_DIR, 'packs/fluent-emoji'));
  if (!version) throw new Error('assets/packs/fluent-emoji is empty: run pnpm assets:fetch');
  const pictures = new Set((await readdir(path.join(ASSETS_DIR, 'packs/fluent-emoji', version, 'props'))).map((f) => f.replace(/\.png$/, '')));
  for (const model of PROP_MODELS.values()) if (!pictures.has(model.emoji)) throw new Error(`prop model ${model.emoji} has no picture`);
  await rm(PROPS_DIR, { recursive: true, force: true });
  await mkdir(PROPS_DIR, { recursive: true });
  const over: string[] = [];
  for (const [id, prop] of Object.entries(catalogue.props).sort(([a], [b]) => a.localeCompare(b))) {
    const png = await readFile(path.join(ASSETS_DIR, 'packs/fluent-emoji', version, 'props', `${prop.emoji}.png`));
    const mesh = propMesh(png, prop);
    const triangles = mesh.indices.length / 3;
    if (triangles > TRIANGLE_BUDGET) over.push(`${id} (${triangles})`);
    const size = mesh.size.map((v) => v.toFixed(1)).join(' × ');
    console.log(`${id}: ${mesh.built === 'code' ? 'modelled' : 'extruded'}, ${size} (card ${mesh.card.width} × ${mesh.card.height}), ${triangles} triangles`);
    await writeFile(path.join(PROPS_DIR, `${id}.glb`), await propGlb(mesh));
  }
  if (over.length > 0) throw new Error(`over ${TRIANGLE_BUDGET} triangles: ${over.join(', ')}`);
  console.log(`emoji props: ${Object.keys(catalogue.props).length} models in assets/generated/props`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
