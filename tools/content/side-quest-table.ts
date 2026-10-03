// The minigame side quests and the characters who offer them, one table per region
// (tools/content/side-quests/<region>.json): who gives which games, where on the map they stand, the people
// and animals round them, and every line of each invitation. `build-side-quests.ts` writes the quest files
// and the givers' catalogue entries from it; the map generators read it to place the givers by the ways and
// their company round them (tools/world/side-givers.ts). Hand-written side quests (the first three, in the
// forest) stay as they are and are not in the tables.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { AMBIENT_ROUTINES } from '../../packages/voxel/src/world-entities';
import { REPO_ROOT } from '../assets/asset-lib';

export const SIDE_TABLE_DIR = path.join(REPO_ROOT, 'tools/content/side-quests');

const Id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
/** A line the child reads: long enough to be a sentence, short enough for a dialogue bubble. */
const Line = z.string().min(8).max(140);
const Cell = z.tuple([z.number().int().min(0), z.number().int().min(0)]);

/**
 * Everyday folk the table may add round a giver or at a place: trades and animals whose routine needs no
 * fixed workplace (a counter, a field, a bank), so they look right wherever the ground is open.
 */
export const FOLK_ROUTINES = ['shopper', 'porter', 'sweeper', 'pupil', 'kite-flyer', 'reader', 'waterer', 'teacher', 'sentry', 'trumpeter', 'cow', 'pig', 'dog', 'cat', 'chick', 'penguin', 'polar-bear', 'monkey'] as const satisfies ReadonlyArray<(typeof AMBIENT_ROUTINES)[number]>;

/** A person (Kenney Blocky Characters, `person-a`…`person-r`) or a farm, snow or island animal. */
const FolkModel = z.string().regex(/^(person-[a-r]|animal-(cow|pig|dog|cat|chick|penguin|polar|monkey))$/);

const folk = {
  routine: z.enum(FOLK_ROUTINES),
  /** Shown on the prompt ("Bạn nhỏ cổ vũ"). */
  name: z.string().min(2).max(40),
  model: FolkModel,
};
const Folk = z.strictObject(folk);
export type Folk = z.infer<typeof Folk>;

/** A place on the map: a landmark of that name (`place`), or a column (`at`) when the map names nothing there. */
const anchor = { place: z.string().min(2).optional(), at: Cell.optional() };
const oneAnchor = (a: { place?: string; at?: readonly [number, number] }): boolean => (a.place === undefined) !== (a.at === undefined);
const ONE_ANCHOR = { message: 'stands at a landmark ("place") or a column ("at"), one of them' };

const SideGame = z.strictObject({
  game: Id,
  /** Quest title in the list ("Bắt vịt cùng Mèo Đầm Sen"). */
  title: Line,
  summary: Line,
  /** The giver's two lines of invitation; `{name}` is the child. */
  lines: z.tuple([Line, Line]),
  /** The child's answer. */
  choice: z.string().min(2).max(60),
  /** What to reach, with `{goal}` where the number goes (written out in words). */
  prompt: Line.refine((p) => p.includes('{goal}'), { message: 'the prompt says the goal: put {goal} where the number goes' }),
  /** The giver's cheer on a win. */
  reward: Line,
  /** Where the story goes next. */
  next: Line,
  /** Seven questions: the child's role, and what the game trains. */
  who: z.string().min(4).max(80),
  learn: z.string().min(4).max(80),
});
export type SideGame = z.infer<typeof SideGame>;

const SideGiver = z
  .strictObject({
    /** Target id on the map (content/world/targets.json). */
    id: Id,
    name: z.string().min(3).max(32),
    /** Look in content/world/looks.json (an npc). */
    look: Id,
    /**
     * Colour its look is multiplied by: the giver then gets a look of its own, `<look>-<id>` (a look draws a few
     * characters at most, content:check).
     */
    tint: z.string().regex(/^#[0-9a-f]{6}$/).optional(),
    /** Where it stands, for the seven questions ("Bên bờ đầm sen"). */
    where: z.string().min(4).max(80),
    /** Folk who keep it company (the onlookers of its games). */
    company: z.array(Folk).max(3).default([]),
    /** A giver offers two to four games: the child picks one. */
    games: z.array(SideGame).min(2).max(4),
    ...anchor,
  })
  .refine(oneAnchor, ONE_ANCHOR);
export type SideGiver = z.infer<typeof SideGiver>;

const Resident = z.strictObject({ ...folk, ...anchor }).refine(oneAnchor, ONE_ANCHOR);
export type SideResident = z.infer<typeof Resident>;

export const SideQuestTable = z.strictObject({
  region: Id,
  givers: z.array(SideGiver).min(1),
  /** More everyday folk, at places the givers leave empty, so the whole map has someone to meet. */
  residents: z.array(Resident).default([]),
});
export type SideQuestTable = z.infer<typeof SideQuestTable>;

/** Every region's table, parsed (a broken table is an error naming its file). */
export function readSideQuestTables(dir: string = SIDE_TABLE_DIR): SideQuestTable[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => {
      const parsed = SideQuestTable.safeParse(JSON.parse(readFileSync(path.join(dir, f), 'utf8')));
      if (!parsed.success) throw new Error(`tools/content/side-quests/${f}: ${parsed.error.message}`);
      if (`${parsed.data.region}.json` !== f) throw new Error(`tools/content/side-quests/${f} holds region ${parsed.data.region}: name the file after its region`);
      return parsed.data;
    });
}

/** The table of one region (empty when the region has none). */
export function sideQuestTableOf(region: string, dir: string = SIDE_TABLE_DIR): SideQuestTable {
  return readSideQuestTables(dir).find((t) => t.region === region) ?? { region, givers: [], residents: [] };
}
