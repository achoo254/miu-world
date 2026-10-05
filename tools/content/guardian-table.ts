// The zone guardians of each map, one table per region (tools/content/guardians/<region>.json): who guards which zone,
// the lessons its questions come from, every line it says and its four or five questions, in both languages.
// `build-guardian-quests.ts` writes the quest files (`content/quests/ward-*.json`) and the guardians' catalogue
// entries from it. Where each guardian stands is the region's side-quest table (`guardians`, tools/content/side-quests),
// read by the map generators with the givers and the co-op hosts.
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { REPO_ROOT } from '../assets/asset-lib';

export const GUARDIAN_TABLE_DIR = path.join(REPO_ROOT, 'tools/content/guardians');

const Id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
/** A line the child reads: long enough to be a sentence, short enough for a speech bubble. */
const Line = z.string().min(8).max(160);
/** A choice on a question's button. */
const Label = z.string().min(1).max(80);
const Three = z.tuple([Line, Line, Line]);

const Turn = z
  .strictObject({
    id: Id,
    /** Skill id from content/learning/skills.json the question trains. */
    skill: Id,
    prompt: Line,
    choices: z.array(Label).min(2).max(4),
    /** Index of the right choice. */
    answer: z.number().int().min(0),
    en: z.strictObject({ prompt: Line, choices: z.array(Label).min(2).max(4) }),
  })
  .refine((t) => t.answer < t.choices.length, { message: 'the answer is one of the choices' })
  .refine((t) => t.en.choices.length === t.choices.length, { message: 'the English choices are as many as the choices' });
export type GuardianTurn = z.infer<typeof Turn>;

const Guardian = z.strictObject({
  /** Quest id: `ward-` and the guardian's zone. */
  quest: Id.refine((id) => id.startsWith('ward-'), { message: 'a zone guardian quest id starts with "ward-"' }),
  /** Target id on the map (content/world/targets.json). */
  id: Id,
  name: z.string().min(3).max(32),
  /** Look in content/world/looks.json the guardian's own look is made from (an npc). */
  look: Id,
  /** Colour its look is multiplied by: the guardian gets a look of its own, `<look>-<id>`. */
  tint: z.string().regex(/^#[0-9a-f]{6}$/),
  /** Standing height in blocks: a guardian stands taller than the folk round it. */
  height: z.number().min(1).max(4),
  /** The zone it guards, as the seven questions name it. */
  zone: z.string().min(4).max(80),
  /** Lessons of that zone its questions are drawn from (their skills). */
  lessons: z.array(Id).min(1),
  /** What the fight trains, for the seven questions and the summary. */
  learn: z.string().min(4).max(120),
  summary: Line,
  /** Its two opening lines; `{name}` is the child. */
  hook: z.tuple([Line, Line]),
  /** The child's answer. */
  choice: z.string().min(2).max(60),
  intro: Line,
  win: Line,
  /** After a blow lands, and after a miss: never the same line twice in a row. */
  right: Three,
  wrong: Three,
  reward: Line,
  next: Line,
  turns: z.array(Turn).min(4).max(5),
  en: z.strictObject({
    summary: Line,
    hook: z.tuple([Line, Line]),
    choice: z.string().min(2).max(60),
    intro: Line,
    win: Line,
    right: Three,
    wrong: Three,
    reward: Line,
    next: Line,
  }),
});
export type Guardian = z.infer<typeof Guardian>;

export const GuardianTable = z.strictObject({
  region: Id,
  guardians: z.array(Guardian).min(1),
});
export type GuardianTable = z.infer<typeof GuardianTable>;

/** Every region's table, parsed (a broken table is an error naming its file). */
export function readGuardianTables(dir: string = GUARDIAN_TABLE_DIR): GuardianTable[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((file) => {
      const parsed = GuardianTable.safeParse(JSON.parse(readFileSync(path.join(dir, file), 'utf8')));
      if (!parsed.success) throw new Error(`tools/content/guardians/${file}: ${parsed.error.message}`);
      if (`${parsed.data.region}.json` !== file) throw new Error(`tools/content/guardians/${file}: its region is ${parsed.data.region}`);
      return parsed.data;
    });
}
