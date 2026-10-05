// The characters of each map and their stories (content/npcs/<region>.json, packages/schema/src/npc.ts), checked
// against the targets, items and quests at boot: a profile names a character the map draws, a story's chapters are
// story quests of the same map opening at that character, every line is new, and the story chapters sort after
// every lesson of their map (the quest list follows file order: a story never takes the place of the first lesson).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { STORY_QUEST_PREFIX, type QuestDefinition } from '@miu/schema/content';
import type { MailTemplate } from '@miu/schema/mail';
import {
  MIN_ARCS_PER_MAP,
  MIN_NPCS_PER_MAP,
  NPC_TIMES,
  NpcMapFile,
  type NpcProfile,
  type NpcRelation,
  type StoryArc,
  type StoryChapter,
} from '@miu/schema/npc';

/** The mail template id of the letter a chapter sends. */
export const letterTemplateId = (questId: string): string => `letter-${questId}`;

export interface NpcEntry {
  profile: NpcProfile;
  region: string;
  climate: NpcMapFile['climate'];
  /** Target ids that are this character (its own and the entries naming it as `character`), sorted. */
  targets: string[];
}

export interface ChapterEntry {
  arc: StoryArc;
  chapter: StoryChapter;
  /** 1-based. */
  part: number;
  npc: string;
}

export interface NpcCatalog {
  npcs: ReadonlyMap<string, NpcEntry>;
  /** Target id → the character it is. */
  npcOfTarget: ReadonlyMap<string, string>;
  /** Character id → its arcs, in file order. */
  arcsOf: ReadonlyMap<string, readonly StoryArc[]>;
  /** Story quest id → its arc and place in it. */
  chapters: ReadonlyMap<string, ChapterEntry>;
  relations: readonly NpcRelation[];
  /** The chapters' letters as mail templates, by template id (`letter-<quest>`): never seeded, sent on a finish. */
  letters: ReadonlyMap<string, MailTemplate>;
}

export const EMPTY_NPC_CATALOG: NpcCatalog = { npcs: new Map(), npcOfTarget: new Map(), arcsOf: new Map(), chapters: new Map(), relations: [], letters: new Map() };

/** Every file of the characters' folder (`content/npcs`; none: no characters yet), parsed; a broken file names itself. */
export function readNpcFiles(folder: string): NpcMapFile[] {
  if (!existsSync(folder)) return [];
  return readdirSync(folder)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => {
      const parsed = NpcMapFile.safeParse(JSON.parse(readFileSync(path.join(folder, f), 'utf8')));
      if (!parsed.success) throw new Error(`invalid content file npcs/${f}: ${parsed.error.message}`);
      if (`${parsed.data.region}.json` !== f) throw new Error(`invalid content file npcs/${f}: name the file after its region (${parsed.data.region}.json)`);
      return parsed.data;
    });
}

export interface NpcCheckContext {
  /** content/world/targets.json: name, look, and the character an entry is. */
  targets: ReadonlyMap<string, { name: string; look: string; character?: string }>;
  /** Whether a look draws a character (`npc`). */
  isNpcLook: (look: string) => boolean;
  /** content/items by id, with its kind. */
  items: ReadonlyMap<string, { kind: string }>;
  /** Every quest file (drafts included). */
  quests: readonly QuestDefinition[];
  /** Open regions (a characters' file names one of them). */
  openRegions: ReadonlySet<string>;
  /**
   * Every open region has its characters' file with MIN_NPCS_PER_MAP profiles and MIN_ARCS_PER_MAP stories
   * (`pnpm content:check`; the server boots on any subset, as test content does).
   */
  requireEveryMap?: boolean;
}

const lower = (text: string): string => text.normalize('NFC').trim().toLocaleLowerCase('vi');

/** What is wrong with the characters' files against the rest of the content (empty: nothing). */
export function npcCatalogIssues(files: readonly NpcMapFile[], ctx: NpcCheckContext): string[] {
  const issues: string[] = [];
  const known = new Map<string, string>();
  for (const file of files) {
    for (const npc of file.npcs) {
      if (known.has(npc.id)) issues.push(`character ${npc.id} has a profile in npcs/${known.get(npc.id)}.json and npcs/${file.region}.json`);
      known.set(npc.id, file.region);
    }
  }
  for (const region of ctx.requireEveryMap ? ctx.openRegions : []) {
    const file = files.find((f) => f.region === region);
    if (!file) issues.push(`open region ${region} has no characters' file (content/npcs/${region}.json)`);
    else {
      if (file.npcs.length < MIN_NPCS_PER_MAP) issues.push(`npcs/${region}.json profiles ${file.npcs.length} characters, at least ${MIN_NPCS_PER_MAP}`);
      if (file.arcs.length < MIN_ARCS_PER_MAP) issues.push(`npcs/${region}.json tells ${file.arcs.length} stories, at least ${MIN_ARCS_PER_MAP}`);
    }
  }
  const questsById = new Map(ctx.quests.map((q) => [q.id, q]));
  /**
   * A character of another map may be named before its map's file is written (maps are written one at a time): the
   * server boots on that, content:check (`requireEveryMap`) asks for every name to be a profile.
   */
  const knownOrLater = (id: string): boolean => known.has(id) || !ctx.requireEveryMap;
  const seenLines = new Map<string, string>();
  const arcIds = new Set<string>();
  const inArc = new Map<string, string>();
  for (const file of files) {
    const here = new Set(file.npcs.map((n) => n.id));
    for (const npc of file.npcs) {
      const at = `character ${npc.id}`;
      const target = ctx.targets.get(npc.id);
      if (!target) issues.push(`${at} is not a target of content/world/targets.json`);
      else {
        if (target.name !== npc.name) issues.push(`${at} is called "${target.name}" in content/world/targets.json, not "${npc.name}"`);
        if (!ctx.isNpcLook(target.look)) issues.push(`${at}: its look ${target.look} is not a character's (npc) look`);
        if (target.character !== undefined) issues.push(`${at} is a copy of ${target.character}: profile the character itself`);
      }
      for (const item of npc.likes) if (!ctx.items.has(item)) issues.push(`${at} likes ${item}, which content/items does not describe`);
      for (const time of NPC_TIMES) if (!npc.lines.some((l) => l.when === time)) issues.push(`${at} has no line for the ${time}`);
      if (npc.lines.filter((l) => l.weather !== undefined).length < 2) issues.push(`${at} needs at least two lines about the weather`);
      if (npc.lines.filter((l) => l.hearts !== undefined).length < 3) issues.push(`${at} needs at least three lines for close friends (hearts)`);
      if (!npc.lines.some((l) => l.about !== undefined)) issues.push(`${at} needs a line about another character it knows (about)`);
      for (const line of npc.lines) {
        if (line.weather === 'snow' && file.climate !== 'snowy') issues.push(`${at}: "${line.vi}" is about snow on a map without snow`);
        if (line.weather === 'rain' && file.climate === 'snowy') issues.push(`${at}: "${line.vi}" is about rain on a snowy map`);
        if (line.about !== undefined && (line.about === npc.id || !knownOrLater(line.about))) issues.push(`${at}: a line is about ${line.about}, which is not another profiled character`);
        for (const text of [line.vi, line.en]) {
          const key = lower(text);
          const first = seenLines.get(key);
          if (first) issues.push(`${at} repeats "${text}" (already said by ${first}): write a new line`);
          else seenLines.set(key, npc.id);
        }
      }
    }
    const pairs = new Set<string>();
    let within = 0;
    let across = 0;
    for (const rel of file.relations) {
      const key = [rel.a, rel.b].sort().join('|');
      if (rel.a === rel.b) issues.push(`npcs/${file.region}.json: ${rel.a} is related to itself`);
      if (!here.has(rel.a) && !here.has(rel.b)) issues.push(`npcs/${file.region}.json: the relation ${rel.a}–${rel.b} has neither character on this map`);
      for (const id of [rel.a, rel.b]) if (!knownOrLater(id)) issues.push(`npcs/${file.region}.json: ${id} in a relation has no profile`);
      if (pairs.has(key)) issues.push(`npcs/${file.region}.json: ${rel.a} and ${rel.b} are related twice`);
      pairs.add(key);
      if (here.has(rel.a) && here.has(rel.b)) within++;
      else across++;
    }
    if (within < 1) issues.push(`npcs/${file.region}.json: its characters need a relation with each other`);
    if (across < 1) issues.push(`npcs/${file.region}.json: its characters need a relation with a character of another map`);
    for (const npc of file.npcs) {
      if (!files.some((f) => f.relations.some((r) => r.a === npc.id || r.b === npc.id))) issues.push(`character ${npc.id} knows nobody: give it a relation`);
    }
    for (const arc of file.arcs) {
      const at = `story ${arc.id}`;
      if (arcIds.has(arc.id)) issues.push(`${at} is told twice`);
      arcIds.add(arc.id);
      if (!here.has(arc.npc)) issues.push(`${at}: its character ${arc.npc} has no profile in npcs/${file.region}.json`);
      const own = new Set([arc.npc, ...[...ctx.targets].filter(([, t]) => t.character === arc.npc).map(([id]) => id)]);
      let hearts = 0;
      arc.chapters.forEach((chapter, i) => {
        const where = `${at} chapter ${i + 1}`;
        if (i === 0 && chapter.hearts !== 0) issues.push(`${where}: the first chapter is told to anyone (hearts 0)`);
        if (chapter.hearts < hearts) issues.push(`${where} asks for fewer hearts than the chapter before it`);
        hearts = chapter.hearts;
        const other = inArc.get(chapter.quest);
        if (other) issues.push(`${where}: quest ${chapter.quest} is already a chapter of ${other}`);
        inArc.set(chapter.quest, arc.id);
        if (!knownOrLater(chapter.letter.from)) issues.push(`${where}: its letter comes from ${chapter.letter.from}, who has no profile`);
        for (const item of Object.keys(chapter.letter.reward.items)) if (!ctx.items.has(item)) issues.push(`${where}: its letter gives ${item}, which content/items does not describe`);
        const quest = questsById.get(chapter.quest);
        if (!quest) {
          issues.push(`${where}: quest ${chapter.quest} is not in content/quests`);
          return;
        }
        if (quest.status === 'stub' || quest.category !== 'story') issues.push(`${where}: quest ${chapter.quest} is not a story chapter ("category": "story")`);
        if (quest.region !== file.region) issues.push(`${where}: quest ${chapter.quest} is in ${quest.region}, not ${file.region}`);
        const first = quest.status === 'stub' ? undefined : quest.steps[0];
        const opensAt = first && 'target' in first ? first.target : undefined;
        if (first && !own.has(opensAt ?? '')) issues.push(`${where}: quest ${chapter.quest} opens at ${opensAt ?? 'nothing'}, not at ${arc.npc}, whose story it is`);
      });
    }
  }
  // A found thing leaves the world: a character met in the world for its card and its stories is never one to find.
  const profiled = new Set([...known.keys(), ...[...ctx.targets].filter(([, t]) => t.character !== undefined && known.has(t.character)).map(([id]) => id)]);
  for (const quest of ctx.quests) {
    if (quest.status === 'stub') continue;
    if (quest.category === 'story' && !inArc.has(quest.id)) issues.push(`story chapter ${quest.id} is in no story of content/npcs`);
    for (const step of quest.steps) {
      const found = step.kind === 'search' ? step.targets : step.kind === 'find-object' ? step.items.map((i) => i.target) : [];
      for (const id of found) if (profiled.has(id)) issues.push(`quest ${quest.id} step ${step.id}: ${id} is a profiled character, never a thing to find (found things leave the world)`);
    }
  }
  issues.push(...storyOrderIssues(ctx.quests));
  return issues;
}

/**
 * The quest list follows file order: every story chapter of a map sorts after every lesson of that map, so a story
 * never takes the place of the map's first lesson (or any lesson) as the one to play next.
 */
export function storyOrderIssues(quests: readonly QuestDefinition[]): string[] {
  const issues: string[] = [];
  const isStory = (q: QuestDefinition): boolean => q.status !== 'stub' && q.category === 'story';
  const isLesson = (q: QuestDefinition): boolean => q.status === 'stub' || (q.category ?? 'main') === 'main';
  const lastLesson = new Map<string, string>();
  for (const quest of quests) {
    if (!isLesson(quest)) continue;
    const last = lastLesson.get(quest.region);
    if (last === undefined || `${quest.id}.json` > `${last}.json`) lastLesson.set(quest.region, quest.id);
  }
  for (const quest of quests.filter(isStory)) {
    if (!quest.id.startsWith(STORY_QUEST_PREFIX)) continue; // the schema reports the prefix
    const last = lastLesson.get(quest.region);
    if (last !== undefined && `${quest.id}.json` < `${last}.json`) issues.push(`story chapter ${quest.id} sorts before the lesson ${last} of ${quest.region}: the quest list would offer it first`);
  }
  return issues;
}

/** The catalogue the routes read; `files` must have passed `npcCatalogIssues`. */
export function buildNpcCatalog(files: readonly NpcMapFile[], targets: NpcCheckContext['targets']): NpcCatalog {
  const npcs = new Map<string, NpcEntry>();
  const npcOfTarget = new Map<string, string>();
  for (const file of files) {
    for (const profile of file.npcs) {
      const copies = [...targets].filter(([, t]) => t.character === profile.id).map(([id]) => id);
      const ids = [profile.id, ...copies].sort();
      npcs.set(profile.id, { profile, region: file.region, climate: file.climate, targets: ids });
      for (const id of ids) npcOfTarget.set(id, profile.id);
    }
  }
  const arcsOf = new Map<string, StoryArc[]>();
  const chapters = new Map<string, ChapterEntry>();
  const letters = new Map<string, MailTemplate>();
  for (const file of files) {
    for (const arc of file.arcs) {
      arcsOf.set(arc.npc, [...(arcsOf.get(arc.npc) ?? []), arc]);
      arc.chapters.forEach((chapter, i) => {
        chapters.set(chapter.quest, { arc, chapter, part: i + 1, npc: arc.npc });
        const { letter } = chapter;
        letters.set(letterTemplateId(chapter.quest), {
          id: letterTemplateId(chapter.quest),
          sender: npcs.get(letter.from)?.profile.name ?? letter.from,
          title: letter.title,
          body: letter.body,
          category: 'npc',
          reward: { coins: letter.reward.coins, xp: letter.reward.xp, items: letter.reward.items },
          icon: 'envelope',
        });
      });
    }
  }
  return { npcs, npcOfTarget, arcsOf, chapters, relations: files.flatMap((f) => f.relations), letters };
}
