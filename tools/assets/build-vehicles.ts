// Writes the life-size vehicles (owner, 03/10/2026: vehicles were too small and plain) into
// content/accessories/<id>.json from the voxel models in vehicle-models-*.ts: ride, palette (with shades
// derived per colour variant) and boxes. Id, name, unlock and the variant list stay as the file has them.
// Edit a model, then: pnpm exec tsx tools/assets/build-vehicles.ts [id-part…], then pnpm assets:accessories.
// Same models, same bytes (build-vehicles.test.ts holds the files to their models).
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseAccessory, type AccessoryDef } from '../../packages/voxel/src/accessory-schema';
import { buildAccessoryMesh, rasterizeAccessory } from '../../packages/voxel/src/voxel-accessory';
import { REPO_ROOT } from './asset-lib';
import { carpet, cloud, hoverboard, rocketBoard, scooter, skateboard, starship } from './vehicle-models-boards';
import { bus, fireTruck, iceCream, toyCar, tractor, train } from './vehicle-models-cars';
import { dragon, duckCar, ladybug, pumpkin, swan, tricycle } from './vehicle-models-rides';
import { Grid, shade, type VehicleModel } from './vehicle-voxel-grid';

export const VEHICLE_MODELS: readonly VehicleModel[] = [
  toyCar,
  bus,
  fireTruck,
  iceCream,
  tractor,
  train,
  duckCar,
  swan,
  ladybug,
  pumpkin,
  dragon,
  tricycle,
  skateboard,
  scooter,
  hoverboard,
  rocketBoard,
  carpet,
  cloud,
  starship,
];

const VOXEL_SIZE = 0.0625;
export const vehicleFile = (id: string): string => path.join(REPO_ROOT, 'content/accessories', `${id}.json`);

/** `{ "a": 1, "b": "x" }` on one line, as the accessory files list small objects. */
function inline(value: object): string {
  const json = JSON.stringify(value);
  return json === '{}' ? '{}' : json.replace(/,"/g, ', "').replace(/":/g, '": ').replace(/^\{/, '{ ').replace(/\}$/, ' }');
}

/** The voxels of a model, with the space her seated legs lie in kept clear and nothing below the ground. */
function vehicleGrid(model: VehicleModel): Grid {
  const g = new Grid();
  model.build(g);
  // Seated, her legs lie straight out in front (x ±6, seat + 1 … + 6, z 0 … 7; vehicle-ride.test.ts).
  if (model.ride.pose !== 'stand') g.box(-6, Math.round(model.ride.height / VOXEL_SIZE) + 1, 0, 12, 6, 8, null);
  return g.clearBelow(0);
}

/** The accessory file text for `model`, keeping what `current` (the file as it is) says about id, name, unlock and variants. */
export function vehicleJson(model: VehicleModel, current: AccessoryDef): string {
  if (current.id !== model.id || current.slot !== 'vehicle') throw new Error(`${model.id}: not the vehicle file ${current.id}`);
  const derived = model.derived ?? {};
  const palette: Record<string, string> = { ...model.palette };
  for (const [key, [source, factor]] of Object.entries(derived)) {
    const base = palette[source];
    if (!base) throw new Error(`${model.id}: derived ${key} from unknown colour ${source}`);
    palette[key] = shade(base, factor);
  }
  for (const key of Object.keys(current.palette)) if (!(key in palette)) throw new Error(`${model.id}: palette drops ${key}`);
  const variants: Record<string, Record<string, string>> = {};
  for (const [name, overrides] of Object.entries(current.variants)) {
    const variant: Record<string, string> = {};
    for (const [key, value] of Object.entries(overrides)) if (!(key in derived)) variant[key] = value;
    Object.assign(variant, model.variantExtra?.[name] ?? {});
    for (const [key, [source, factor]] of Object.entries(derived)) {
      const recoloured = variant[source];
      if (recoloured) variant[key] = shade(recoloured, factor);
    }
    variants[name] = variant;
  }
  const boxes = vehicleGrid(model).toBoxes();
  for (const box of boxes) if (!(box.color in palette)) throw new Error(`${model.id}: colour ${box.color} is not in the palette`);
  const lines = [
    '{',
    `  "id": ${JSON.stringify(current.id)},`,
    `  "name": ${JSON.stringify(current.name)},`,
    '  "slot": "vehicle",',
    ...(current.unlock ? [`  "unlock": ${inline(current.unlock)},`] : []),
    '  "attachNode": "ground",',
    `  "voxelSize": ${VOXEL_SIZE},`,
    '  "offset": [0, 0, 0],',
    `  "ride": ${inline(model.ride)},`,
    '  "palette": {',
    Object.entries(palette)
      .map(([key, value]) => `    ${JSON.stringify(key)}: ${JSON.stringify(value)}`)
      .join(',\n'),
    '  },',
    '  "variants": {',
    Object.entries(variants)
      .map(([name, variant]) => `    ${JSON.stringify(name)}: ${inline(variant)}`)
      .join(',\n'),
    '  },',
    '  "boxes": [',
    boxes.map((box) => `    ${inline(box)}`).join(',\n'),
    '  ]',
    '}',
    '',
  ];
  return lines.join('\n');
}

async function main(): Promise<void> {
  const wanted = process.argv.slice(2);
  for (const model of VEHICLE_MODELS) {
    if (wanted.length > 0 && !wanted.some((part) => model.id.includes(part))) continue;
    const file = vehicleFile(model.id);
    const text = vehicleJson(model, parseAccessory(JSON.parse(await readFile(file, 'utf8'))));
    const def = parseAccessory(JSON.parse(text));
    const volume = rasterizeAccessory(def);
    const blocks = (voxels: number): string => (voxels * VOXEL_SIZE * 0.68).toFixed(2); // world blocks at PLAYER_SCALE
    console.log(
      `${model.id}: ${blocks(volume.dims[2])} × ${blocks(volume.min[1] + volume.dims[1])} × ${blocks(volume.dims[0])} blocks (long × high × wide), ${def.boxes.length} boxes, ${buildAccessoryMesh(def).triangles} triangles`,
    );
    await writeFile(file, text);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
