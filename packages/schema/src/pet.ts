// Pet catalogue (content/pets.json): the little companions a child may pick in the Character Creator,
// which then trot after the character in the world. A new pet is a new entry (a model from a licensed
// pack, or a colour variant of one through `recolor`); the creator, the server check and the game read this list.
import { z } from 'zod';
import { ContentId } from './content';

/**
 * The swatches of the Kenney Cube Pets' shared colour atlas (`Textures/colormap.png`, 512 × 512): 8
 * columns × 4 rows of 64 × 128 px, each a flat half and a vertical gradient half (row 0 is unused black).
 * Every pet samples a few of them; a colour variant points the faces of one swatch at another, so the
 * shading gradient and the single texture (one draw call) stay as they are. Value: [column, row].
 */
export const PET_SWATCHES = {
  orange: [0, 1],
  coral: [1, 1],
  blue: [2, 1],
  'sky-blue': [3, 1],
  purple: [4, 1],
  magenta: [5, 1],
  'blue-grey': [0, 2],
  white: [1, 2],
  tan: [2, 2],
  brown: [3, 2],
  peach: [4, 2],
  cream: [5, 2],
  green: [6, 2],
  yellow: [7, 2],
  pink: [0, 3],
  indigo: [1, 3],
  sand: [2, 3],
  ginger: [3, 3],
  red: [4, 3],
  black: [5, 3],
  grey: [6, 3],
  /** The eyes and noses of every pet (and the dark fur of a few): recolouring it would recolour the eyes. */
  dark: [7, 3],
} as const satisfies Record<string, readonly [number, number]>;
export type PetSwatch = keyof typeof PET_SWATCHES;
const SWATCH_COLUMNS = 8;
const SWATCH_ROWS = 4;

const swatchName = z.enum(Object.keys(PET_SWATCHES) as [PetSwatch, ...PetSwatch[]]);

/** The swatch a texture coordinate (glTF uv: v grows downward) falls in, or null outside every swatch. */
export function swatchAt(u: number, v: number): PetSwatch | null {
  const column = Math.floor(u * SWATCH_COLUMNS);
  const row = Math.floor(v * SWATCH_ROWS);
  for (const [name, [c, r]] of Object.entries(PET_SWATCHES) as Array<[PetSwatch, readonly [number, number]]>) {
    if (c === column && r === row) return name;
  }
  return null;
}

/** How far (in uv) a coordinate moves to sample `to` instead of `from`, at the same spot in its gradient. */
export function swatchShift(from: PetSwatch, to: PetSwatch): [number, number] {
  const [fc, fr] = PET_SWATCHES[from];
  const [tc, tr] = PET_SWATCHES[to];
  return [(tc - fc) / SWATCH_COLUMNS, (tr - fr) / SWATCH_ROWS];
}

export const Pet = z.strictObject({
  id: ContentId,
  /** What the child reads on its tile, e.g. "Cún con". */
  name: z.string().min(1),
  /** Manifest path of its model (Kenney Cube Pets): clips `idle`, `walk`, `run`, `dance`. */
  model: z.string().regex(/^packs\/.+\.glb$/),
  /** World size relative to the model (the pets stand knee-high to the character). */
  scale: z.number().positive().max(2),
  /**
   * A colour variant of the model: each swatch it samples (key) drawn with another (value), e.g.
   * `{ "grey": "white" }` turns the grey kitten white. `pnpm content:check` makes sure the model uses every key.
   */
  recolor: z
    .partialRecord(swatchName, swatchName)
    .refine((map) => Object.keys(map).length > 0, { message: 'recolor needs at least one swatch' })
    .refine((map) => Object.entries(map).every(([from, to]) => from !== to), { message: 'recolor maps a swatch to itself' })
    .optional(),
  /** Left out: open from level 1. Otherwise the level from which the child may take it along. */
  unlock: z.strictObject({ level: z.number().int().min(2) }).optional(),
});
export type Pet = z.infer<typeof Pet>;

export const PetCatalog = z
  .strictObject({ version: z.literal(1), pets: z.array(Pet).min(1) })
  .refine((c) => new Set(c.pets.map((p) => p.id)).size === c.pets.length, { message: 'duplicate pet id' })
  .refine((c) => new Set(c.pets.map((p) => p.name)).size === c.pets.length, { message: 'duplicate pet name' });
export type PetCatalog = z.infer<typeof PetCatalog>;

/** Whether a child at `level` may take this pet along (the server checks; the creator shows the lock). */
export function isPetOpen(pet: Pick<Pet, 'unlock'>, level: number): boolean {
  return !pet.unlock || level >= pet.unlock.level;
}

export { petArtPath } from './pet-art';
