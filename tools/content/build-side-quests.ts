// `pnpm exec tsx tools/content/build-side-quests.ts`: writes the minigame side quests and their givers from the
// tables in tools/content/side-quests/ (side-quest-table.ts): one `content/quests/side-<game>.json` per game,
// a catalogue entry per giver in content/world/targets.json, and a tinted look of its own in
// content/world/looks.json for a giver with a `tint`. Re-runnable: the files it wrote last time are
// rewritten, hand-written side quests (not in a table) are left alone. Then regenerate the maps
// (`pnpm world:<map>`) so the givers stand on them.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { QuestDefinition } from '../../packages/schema/src/content';
import { MinigameSpec } from '../../packages/schema/src/minigame';
import { LookCatalog, QuestTargetCatalog, type TargetLook } from '../../packages/schema/src/world-target';
import { CONTENT_DIR } from '../../apps/server/src/content/content-catalog';
import { readSideQuestTables, type SideGame, type SideGiver, type SideQuestTable } from './side-quest-table';

/** What every win pays (the first side quests' reward: small, every round). */
export const SIDE_REWARD = { xp: 15, coin: 5 } as const;

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

/** A whole number from 0 to 9999 in Vietnamese words, as a child reads it ("hai mươi lăm", "một trăm linh năm"). */
export function vietnameseNumber(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 9999) throw new Error(`no words for ${n}`);
  if (n < 10) return DIGITS[n] ?? '';
  if (n < 100) {
    const [tens, ones] = [Math.floor(n / 10), n % 10];
    const head = tens === 1 ? 'mười' : `${DIGITS[tens]} mươi`;
    if (ones === 0) return head;
    if (ones === 5) return `${head} lăm`;
    if (ones === 1 && tens > 1) return `${head} mốt`;
    if (ones === 4 && tens > 1) return `${head} tư`;
    return `${head} ${DIGITS[ones]}`;
  }
  if (n < 1000) {
    const [hundreds, rest] = [Math.floor(n / 100), n % 100];
    const head = `${DIGITS[hundreds]} trăm`;
    if (rest === 0) return head;
    return rest < 10 ? `${head} linh ${DIGITS[rest]}` : `${head} ${vietnameseNumber(rest)}`;
  }
  const [thousands, rest] = [Math.floor(n / 1000), n % 1000];
  const head = `${DIGITS[thousands]} nghìn`;
  if (rest === 0) return head;
  return rest < 100 ? `${head} không trăm ${rest < 10 ? `linh ${DIGITS[rest]}` : vietnameseNumber(rest)}` : `${head} ${vietnameseNumber(rest)}`;
}

/** The prompt with its goal in words; a sentence starting on the goal starts with a capital. */
export function promptWithGoal(prompt: string, goal: number): string {
  const words = vietnameseNumber(goal);
  return prompt.startsWith('{goal}') ? prompt.replace('{goal}', words.charAt(0).toUpperCase() + words.slice(1)) : prompt.replace('{goal}', words);
}

/** One side quest: the giver's invitation, the game at its standard goal, the giver's cheer and the way on. */
export function sideQuestOf(table: SideQuestTable, giver: SideGiver, entry: SideGame, spec: MinigameSpec): QuestDefinition {
  const prompt = promptWithGoal(entry.prompt, spec.goal);
  const quest = {
    id: `side-${entry.game}`,
    region: table.region,
    chapter: 1,
    title: entry.title,
    status: 'active',
    category: 'side',
    summary: entry.summary,
    review: 'teacher-pending',
    sevenQuestions: {
      who: entry.who,
      where: giver.where,
      goal: prompt,
      play: spec.howTo[0] ?? spec.name,
      learn: entry.learn,
      reward: 'XP và xu mỗi lần thắng',
      next: entry.next,
    },
    phases: { hook: 'ask', explore: 'ask', learn: 'ask', challenge: 'play', decision: 'play', finale: 'play', reward: 'thanks', next: 'bye' },
    steps: [
      {
        id: 'ask',
        title: 'Lời mời',
        kind: 'dialogue',
        target: giver.id,
        lines: entry.lines.map((text) => ({ speaker: giver.name, text })),
        choices: [{ text: entry.choice }],
      },
      { id: 'play', title: spec.name, kind: 'challenge', mechanic: 'minigame', trigger: 'auto', prompt, game: entry.game, goal: spec.goal },
      { id: 'thanks', title: 'Phần thưởng', kind: 'reward', trigger: 'auto', text: entry.reward },
      { id: 'bye', title: 'Hẹn lần sau', kind: 'next', trigger: 'auto', text: entry.next },
    ],
    reward: { ...SIDE_REWARD },
  };
  const parsed = QuestDefinition.safeParse(quest);
  if (!parsed.success) throw new Error(`side-${entry.game}: ${parsed.error.message}`);
  // Written as authored (the schema's defaults stay implicit, as in the hand-written side quests).
  return quest as unknown as QuestDefinition;
}

export interface SideBuild {
  quests: QuestDefinition[];
  /** Giver id → its catalogue entry. */
  givers: Map<string, { name: string; look: string }>;
  /** The givers' own tinted looks. */
  looks: Map<string, TargetLook>;
}

/** The look a giver wears: its table's look, or that look tinted as a look of its own. */
export const giverLookId = (giver: Pick<SideGiver, 'id' | 'look' | 'tint'>): string => (giver.tint ? `${giver.look}-${giver.id}` : giver.look);

/**
 * Every table's quests and givers, checked against the game specs and the looks: each game in one table at
 * most, every giver an npc look, one giver id per name.
 */
export function buildSideQuests(tables: readonly SideQuestTable[], specs: ReadonlyMap<string, MinigameSpec>, looks: LookCatalog['looks']): SideBuild {
  const quests: QuestDefinition[] = [];
  const givers = new Map<string, { name: string; look: string }>();
  const tinted = new Map<string, TargetLook>();
  const seenGames = new Set<string>();
  const names = new Map<string, string>();
  for (const table of tables) {
    for (const giver of table.givers) {
      if (givers.has(giver.id)) throw new Error(`giver ${giver.id} is in two tables or twice in ${table.region}`);
      const base = looks[giver.look];
      if (base?.kind !== 'npc') throw new Error(`giver ${giver.id}: look ${giver.look} is not an npc look in content/world/looks.json`);
      if (giver.tint) {
        if (base.tint) throw new Error(`giver ${giver.id}: look ${giver.look} is tinted already, tint its plain look`);
        tinted.set(giverLookId(giver), { ...base, tint: giver.tint });
      }
      const other = names.get(giver.name);
      if (other) throw new Error(`givers ${other} and ${giver.id} are both called ${giver.name}`);
      names.set(giver.name, giver.id);
      givers.set(giver.id, { name: giver.name, look: giverLookId(giver) });
      for (const entry of giver.games) {
        const spec = specs.get(entry.game);
        if (!spec) throw new Error(`giver ${giver.id} offers ${entry.game}, which is not in content/minigames`);
        if (seenGames.has(entry.game)) throw new Error(`${entry.game} is offered twice: one giver per game`);
        seenGames.add(entry.game);
        quests.push(sideQuestOf(table, giver, entry, spec));
      }
    }
  }
  return { quests, givers, looks: tinted };
}

/**
 * The looks file with the givers' own looks added at its end, as text: the catalogue is written by hand (heights
 * like 1.0), so it is not re-serialised. A look already there must be the same; a changed one is edited by hand.
 */
export function withLooks(text: string, known: Readonly<Record<string, unknown>>, looks: ReadonlyMap<string, TargetLook>): string {
  const added: string[] = [];
  for (const [id, look] of looks) {
    if (id in known) {
      if (JSON.stringify(known[id]) !== JSON.stringify(look)) throw new Error(`look ${id} in content/world/looks.json differs from its giver's table: edit or remove it by hand`);
      continue;
    }
    added.push(`  ${JSON.stringify(id)}: ${JSON.stringify(look, null, 1).replace(/\n/g, '\n  ')}`);
  }
  if (added.length === 0) return text;
  const end = text.lastIndexOf('\n }\n}');
  if (end < 0) throw new Error('content/world/looks.json does not end the way the builder expects ("\\n }\\n}")');
  return `${text.slice(0, end)},\n${added.join(',\n')}${text.slice(end)}`;
}

export function readMinigameSpecs(dir: string = path.join(CONTENT_DIR, 'minigames')): Map<string, MinigameSpec> {
  return new Map(
    readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const spec = MinigameSpec.parse(JSON.parse(readFileSync(path.join(dir, f), 'utf8')));
        return [spec.id, spec] as const;
      }),
  );
}

function main(): void {
  const specs = readMinigameSpecs();
  const targetsFile = path.join(CONTENT_DIR, 'world/targets.json');
  const looksFile = path.join(CONTENT_DIR, 'world/looks.json');
  // Validated with the schemas, written back from the raw files so every other entry keeps its fields' order.
  const rawLooks = JSON.parse(readFileSync(looksFile, 'utf8')) as { version: 1; looks: Record<string, unknown> };
  const rawTargets = JSON.parse(readFileSync(targetsFile, 'utf8')) as { version: 1; targets: Record<string, unknown> };
  const lookCatalogue = LookCatalog.parse(rawLooks);
  const catalogue = QuestTargetCatalog.parse(rawTargets);
  const { quests, givers, looks } = buildSideQuests(readSideQuestTables(), specs, lookCatalogue.looks);
  writeFileSync(looksFile, withLooks(readFileSync(looksFile, 'utf8'), rawLooks.looks, looks));
  const questDir = path.join(CONTENT_DIR, 'quests');
  for (const quest of quests) writeFileSync(path.join(questDir, `${quest.id}.json`), `${JSON.stringify(quest, null, 2)}\n`);
  // A target id the lessons already use is someone else: a giver needs its own.
  for (const [id, entry] of givers) {
    const known = catalogue.targets[id];
    if (known && known.name !== entry.name) throw new Error(`target ${id} is already ${known.name} in content/world/targets.json: give the giver another id`);
    rawTargets.targets[id] = entry;
  }
  const sorted = Object.fromEntries(Object.entries(rawTargets.targets).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(targetsFile, `${JSON.stringify({ version: rawTargets.version, targets: sorted }, null, 2)}\n`);
  const offered = new Set(quests.map((q) => ('steps' in q ? q.steps.find((s) => s.kind === 'challenge' && 'game' in s) : undefined)).flatMap((s) => (s && 'game' in s && typeof s.game === 'string' ? [s.game] : [])));
  const handWritten = [...specs.keys()].filter((id) => !offered.has(id) && existsSync(path.join(questDir, `side-${id}.json`)));
  const missing = [...specs.keys()].filter((id) => !offered.has(id) && !handWritten.includes(id));
  console.log(`${quests.length} side quests from ${givers.size} givers; ${handWritten.length} hand-written (${handWritten.join(', ')})`);
  if (missing.length > 0) {
    console.error(`games no character offers: ${missing.join(', ')}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
