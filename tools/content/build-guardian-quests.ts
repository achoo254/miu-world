// `pnpm exec tsx tools/content/build-guardian-quests.ts`: writes the zone guardians' fights from the tables in
// tools/content/guardians/ (guardian-table.ts): one `content/quests/ward-*.json` per guardian, a catalogue entry per
// guardian in content/world/targets.json and its own tinted look in content/world/looks.json. Re-runnable: every
// `ward-*` quest comes from a table, so one no table names any more is removed. Then regenerate the maps
// (`pnpm world:<map>`, one at a time) so the guardians stand on them, where the side-quest tables' `guardians` say.
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { GUARDIAN_QUEST_PREFIX, QuestDefinition } from '../../packages/schema/src/content';
import { LookCatalog, QuestTargetCatalog, type TargetLook } from '../../packages/schema/src/world-target';
import { CONTENT_DIR } from '../../apps/server/src/content/content-catalog';
import { withLooks } from './build-side-quests';
import { readGuardianTables, type Guardian, type GuardianTable } from './guardian-table';
import { readSideQuestTables, type SideQuestTable } from './side-quest-table';

/** HP each right answer takes: the guardian falls on its last question. */
export const GUARDIAN_DAMAGE = 100;
/** What a won fight pays, every time (the server pays it; a run pays once): XP per question, and coins. */
export const GUARDIAN_XP_PER_TURN = 10;
export const GUARDIAN_COINS = 12;
/** The prompt's action on a guardian. */
export const GUARDIAN_LABEL = 'Thách đấu';

const CHOICE_IDS = ['a', 'b', 'c', 'd'] as const;

/**
 * The order a question's choices are shown in: a fixed shuffle of the table's order, seeded by the quest and the
 * question (the tables put the right choice first, which a child would soon learn to tap without reading).
 */
export function choiceOrder(key: string, count: number): number[] {
  let seed = 2166136261;
  for (const ch of key) seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619) >>> 0;
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [order[i], order[j]] = [order[j] ?? j, order[i] ?? i];
  }
  return order;
}

/** The look a guardian wears: its table's look, tinted, as a look of its own. */
export const guardianLookId = (guardian: Pick<Guardian, 'id' | 'look'>): string => `${guardian.look}-${guardian.id}`;

/** One guardian's fight: its lines at the guardian, its boss (one question a blow), its gift and the way on. */
export function guardianQuestOf(table: GuardianTable, g: Guardian): QuestDefinition {
  const en = g.en;
  const skills = [...new Set(g.turns.map((t) => t.skill))];
  const xp = GUARDIAN_XP_PER_TURN * g.turns.length;
  const quest = {
    id: g.quest,
    region: table.region,
    chapter: 1,
    title: `Trùm canh khu: ${g.name}`,
    status: 'active',
    category: 'guardian',
    summary: g.summary,
    review: 'teacher-pending',
    sevenQuestions: {
      who: `{name}, ${g.name}`,
      where: g.zone,
      goal: `Thắng trận đố của ${g.name}`,
      play: `Trả lời ${g.turns.length} câu đố, mỗi câu đúng làm ${g.name} vơi bớt sức`,
      learn: g.learn,
      reward: `${xp} XP, ${GUARDIAN_COINS} Xu mỗi lần thắng`,
      next: g.next,
    },
    phases: { hook: 'gap', explore: 'gap', learn: 'dau', challenge: 'dau', decision: 'dau', finale: 'dau', reward: 'qua', next: 'tiep' },
    steps: [
      {
        id: 'gap',
        title: `Gặp ${g.name}`,
        kind: 'dialogue',
        target: g.id,
        lines: g.hook.map((text) => ({ speaker: g.name, text })),
        choices: [{ text: g.choice }],
        en: { title: `Meet ${g.name}`, lines: [...en.hook], choices: [{ text: en.choice }] },
      },
      {
        id: 'dau',
        title: `Đấu trí với ${g.name}`,
        kind: 'boss',
        trigger: 'auto',
        target: g.id,
        bossId: g.id,
        bossName: g.name,
        introDialogue: g.intro,
        winDialogue: g.win,
        maxHp: GUARDIAN_DAMAGE * g.turns.length,
        damagePerTurn: GUARDIAN_DAMAGE,
        turns: g.turns.map((t) => {
          // Shown in a shuffled order; ids follow the shown order, the English labels the same order.
          const order = choiceOrder(`${g.quest}/${t.id}`, t.choices.length);
          const idAt = (shown: number): string => CHOICE_IDS[shown] ?? `c${shown}`;
          return {
            id: t.id,
            prompt: t.prompt,
            skill: t.skill,
            choices: order.map((from, shown) => ({ id: idAt(shown), text: t.choices[from] ?? '' })),
            damage: GUARDIAN_DAMAGE,
            en: { prompt: t.en.prompt, choices: order.map((from) => t.en.choices[from] ?? '') },
            answer: { choice: idAt(order.indexOf(t.answer)) },
            // The answer layer names the right choice as it reads; the explanation says why.
            support: {
              guide: [...t.guide],
              hint: t.hint,
              answer: { text: t.choices[t.answer] ?? '', explanation: t.explain },
              en: { guide: [...t.en.guide], hint: t.en.hint, answer: { text: t.en.choices[t.answer] ?? '', explanation: t.en.explain } },
            },
          };
        }),
        feedback: { right: [...g.right], wrong: [...g.wrong], en: { right: [...en.right], wrong: [...en.wrong] } },
        en: { title: `Battle of wits with ${g.name}`, bossName: g.name, introDialogue: en.intro, winDialogue: en.win },
      },
      { id: 'qua', title: `Quà của ${g.name}`, kind: 'reward', trigger: 'auto', text: g.reward, en: { title: `${g.name}'s gift`, text: en.reward } },
      { id: 'tiep', title: `Chia tay ${g.name}`, kind: 'next', trigger: 'auto', text: g.next, en: { title: `Goodbye, ${g.name}`, text: en.next } },
    ],
    reward: { xp, coin: GUARDIAN_COINS, skillXp: Object.fromEntries(skills.map((s) => [s, 1])) },
    en: { title: `Zone guardian: ${g.name}`, summary: en.summary },
  };
  const parsed = QuestDefinition.safeParse(quest);
  if (!parsed.success) throw new Error(`${g.quest}: ${parsed.error.message}`);
  return quest as unknown as QuestDefinition;
}

export interface GuardianBuild {
  quests: QuestDefinition[];
  /** Guardian id → its catalogue entry. */
  guardians: Map<string, { name: string; look: string; label: string }>;
  looks: Map<string, TargetLook>;
}

export interface GuardianContext {
  looks: LookCatalog['looks'];
  /** Skill ids (content/learning/skills.json). */
  skills: ReadonlySet<string>;
  /** Lesson id → its region (the `main` quests). */
  lessons: ReadonlyMap<string, string>;
  /** Each region's side-quest table: where its guardians stand. */
  sideTables: readonly SideQuestTable[];
}

/**
 * Every table's fights and guardians, checked: each guardian an npc look, its own id and name, a place to stand in
 * its region's side-quest table (and no place for a guardian that is not in a table), lessons of its own region and
 * known skills.
 */
export function buildGuardianQuests(tables: readonly GuardianTable[], ctx: GuardianContext): GuardianBuild {
  const quests: QuestDefinition[] = [];
  const guardians = new Map<string, { name: string; look: string; label: string }>();
  const looks = new Map<string, TargetLook>();
  const names = new Map<string, string>();
  const questIds = new Set<string>();
  for (const table of tables) {
    const anchors = new Set((ctx.sideTables.find((t) => t.region === table.region)?.guardians ?? []).map((a) => a.id));
    for (const g of table.guardians) {
      if (guardians.has(g.id)) throw new Error(`guardian ${g.id} is in two tables or twice in ${table.region}`);
      if (questIds.has(g.quest)) throw new Error(`quest ${g.quest} is two guardians' fight`);
      questIds.add(g.quest);
      const base = ctx.looks[g.look];
      if (base?.kind !== 'npc') throw new Error(`guardian ${g.id}: look ${g.look} is not an npc look in content/world/looks.json`);
      if (base.tint) throw new Error(`guardian ${g.id}: look ${g.look} is tinted already, tint its plain look`);
      const other = names.get(g.name);
      if (other) throw new Error(`guardians ${other} and ${g.id} are both called ${g.name}`);
      names.set(g.name, g.id);
      if (!anchors.has(g.id)) throw new Error(`guardian ${g.id} has no place to stand: add it to "guardians" in tools/content/side-quests/${table.region}.json`);
      for (const lesson of g.lessons) {
        const region = ctx.lessons.get(lesson);
        if (region !== table.region) throw new Error(`guardian ${g.id}: ${lesson} is not a lesson of ${table.region}`);
      }
      for (const turn of g.turns) if (!ctx.skills.has(turn.skill)) throw new Error(`guardian ${g.id} turn ${turn.id}: unknown skill ${turn.skill}`);
      looks.set(guardianLookId(g), { ...base, tint: g.tint, height: g.height });
      guardians.set(g.id, { name: g.name, look: guardianLookId(g), label: GUARDIAN_LABEL });
      quests.push(guardianQuestOf(table, g));
    }
    const named = new Set(table.guardians.map((g) => g.id));
    for (const id of anchors) if (!named.has(id)) throw new Error(`tools/content/side-quests/${table.region}.json places guardian ${id}, which no guardian table has`);
  }
  for (const side of ctx.sideTables) {
    if (side.guardians.length > 0 && !tables.some((t) => t.region === side.region)) throw new Error(`tools/content/side-quests/${side.region}.json places guardians, but there is no tools/content/guardians/${side.region}.json`);
  }
  return { quests, guardians, looks };
}

/** The context from content/ (looks, skills, lessons) and the side-quest tables. */
export function readGuardianContext(): GuardianContext {
  const read = (rel: string): unknown => JSON.parse(readFileSync(path.join(CONTENT_DIR, rel), 'utf8'));
  const skillsFile = read('learning/skills.json') as { subjects: Array<{ skills: Array<{ id: string }> }> };
  const lessons = new Map<string, string>();
  for (const file of readdirSync(path.join(CONTENT_DIR, 'quests')).filter((f) => f.endsWith('.json'))) {
    const quest = read(`quests/${file}`) as { id: string; region: string; status: string; category?: string };
    if (quest.status === 'active' && (quest.category ?? 'main') === 'main') lessons.set(quest.id, quest.region);
  }
  return {
    looks: LookCatalog.parse(read('world/looks.json')).looks,
    skills: new Set(skillsFile.subjects.flatMap((s) => s.skills.map((k) => k.id))),
    lessons,
    sideTables: readSideQuestTables(),
  };
}

function main(): void {
  const targetsFile = path.join(CONTENT_DIR, 'world/targets.json');
  const looksFile = path.join(CONTENT_DIR, 'world/looks.json');
  const rawLooks = JSON.parse(readFileSync(looksFile, 'utf8')) as { version: 1; looks: Record<string, unknown> };
  const rawTargets = JSON.parse(readFileSync(targetsFile, 'utf8')) as { version: 1; targets: Record<string, unknown> };
  const catalogue = QuestTargetCatalog.parse(rawTargets);
  const { quests, guardians, looks } = buildGuardianQuests(readGuardianTables(), readGuardianContext());
  writeFileSync(looksFile, withLooks(readFileSync(looksFile, 'utf8'), rawLooks.looks, looks));
  const questDir = path.join(CONTENT_DIR, 'quests');
  const written = new Set(quests.map((q) => `${q.id}.json`));
  for (const file of readdirSync(questDir).filter((f) => f.startsWith(GUARDIAN_QUEST_PREFIX) && !written.has(f))) rmSync(path.join(questDir, file));
  for (const quest of quests) writeFileSync(path.join(questDir, `${quest.id}.json`), `${JSON.stringify(quest, null, 2)}\n`);
  // A target id something else already uses is someone else: a guardian needs its own. Entries keep their order (a
  // guardian already there is updated in place, a new one goes at the end), so the catalogue's diff stays small.
  for (const [id, entry] of guardians) {
    const known = catalogue.targets[id];
    if (known && known.name !== entry.name) throw new Error(`target ${id} is already ${known.name} in content/world/targets.json: give the guardian another id`);
    rawTargets.targets[id] = entry;
  }
  writeFileSync(targetsFile, `${JSON.stringify(rawTargets, null, 2)}\n`);
  console.log(`${quests.length} zone guardians on ${new Set(quests.map((q) => q.region)).size} maps`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
