// `pnpm content:check`: validates everything under content/ before it reaches the server or the web
// app. Game content goes through the server's own catalogue loader (schemas + cross-references), so
// this gate and the server boot can never disagree.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CONTENT_DIR, loadContentCatalog, readQuestDefinitions, type ContentCatalog } from '../../apps/server/src/content/content-catalog';
import { AchievementCatalog, achievementIssues } from '../../packages/schema/src/achievement';
import { MAX_SKILL_LEVEL } from '../../packages/schema/src/progression';
import { playerTextIssues } from '../../packages/quest/src/player-name';
import { PrivacyDocument, stepTargets, type QuestDefinition } from '../../packages/schema/src/content';
import { accessoryArtPath } from '../../packages/schema/src/accessory-art';
import { HomeDecorCatalog } from '../../packages/schema/src/home-decor';
import { Item } from '../../packages/schema/src/item';
import { collectibleIssues, type CollectibleSet } from '../../packages/schema/src/collectible';
import { PetCatalog, petArtPath } from '../../packages/schema/src/pet';
import { BoxPropCatalog, EmojiPropCatalog, LookCatalog, QuestTargetCatalog } from '../../packages/schema/src/world-target';
import { RegionCatalog, mapForRegion, regionGuides } from '../../packages/schema/src/region';
import { OlympiadCatalog } from '../../packages/schema/src/olympiad';
import { MailCatalog } from '../../packages/schema/src/mail';
import { UI_ICONS } from '../../apps/web/src/ui/kit/ui-art';
import { MUSIC_MOODS } from '../../apps/web/src/ui/sound/music';
import { SPRITE_PATHS } from '../../apps/web/src/ui/minigame/sprites';
import { loadRegionRewards, questsByRegion } from '../../apps/server/src/region-reward/region-reward-catalog';
import { loadShopCatalog } from '../../apps/server/src/shop/shop-catalog';
import { ACCESSORY_SLOTS, MIN_OPEN_ITEMS, openItemsInSlot, type AccessoryItem } from '../../packages/voxel/src/accessory-schema';
import { modelCatalogSchema } from '../../packages/voxel/src/model-catalog';
import { entitiesForChapter, worldEntitiesSchema } from '../../packages/voxel/src/world-entities';
import { ASSETS_DIR } from '../assets/asset-lib';
import { CURRICULUM_FOLDERS, checkCurriculum } from './check-curriculum';
import { percentCovered, sumGaps } from './content-gaps';
import { varietyIssues } from './content-variety';
import { checkCurriculumLinks } from './curriculum-links';
import { checkLocales } from './check-locales';
import { modelSwatches } from './pet-swatches';
import { questSpread } from './quest-spread';

/** Content files the server catalogue reads (a trailing slash means the `.json` files directly in that folder). */
const CATALOGUE_FILES = [
  'learning/skills.json',
  'names/child-display-names.json',
  'names/character-names.json',
  'legal/consent-vi.json',
  'progression/level-curve.json',
  'progression/skill-curve.json',
  // Gifts of each skill level and the achievements (apps/server/src/progression).
  'progression/skill-gifts.json',
  'progression/achievements.json',
  'pets.json',
  'accessories/',
  'quests/',
  // One file per minigame (packages/schema/src/minigame.ts); quests' minigame steps are checked against them.
  'minigames/',
  // The styles of the child's home (apps/server/src/home): the server reads it at boot.
  'home/decor.json',
  // What the shop sells and for how much (apps/server/src/shop), one file per category.
  'shop/',
  // The collectible sets each region's runs drop (apps/server/src/quest/quest-completion.ts).
  'collectibles.json',
  // Each region's chest: tiers, coins, XP, exclusive wearables and titles (apps/server/src/region-reward).
  'region-rewards.json',
  // Recipes for home cooking at nha-cua-be.
  'recipes.json',
  // Olympic Math Challenge (Phase 0).
  'olympiad/',
  // Mail templates (apps/server/src/mail).
  'mail/',
  // Each map's characters, their everyday lines, relations and stories (apps/server/src/npc).
  'npcs/',
];
/** Content files the asset tools validate when they build characters, atlases and maps (any file in a folder). */
const ASSET_TOOL_FILES = [
  'blocks.json', 'characters.json', 'palette.json', 'species.json', 'character-bases.json', 'outfit-rules.json', 'character-parts/', 'outfits/', 'faces/', 'animations/',
  // Box props of one map (build-box-props.ts) and the views of the owner's detail mocks (render-preview.ts).
  'world/box-props/', 'world/mock-views/',
];
/** Content only the web app reads; validated here. */
const REGIONS_FILE = 'world/regions.json';
const LOOKS_FILE = 'world/looks.json';
const TARGETS_FILE = 'world/targets.json';
const EMOJI_PROPS_FILE = 'world/emoji-props.json';
const BOX_PROPS_FILE = 'world/box-props.json';
const BOX_PROPS_FOLDER = 'world/box-props/';
/** Every model the maps place: height, clip, placing, fading (the map generators and the game read it). */
const MODELS_FILE = 'world/models.json';
const PRIVACY_FILE = 'legal/privacy-vi.json';
const ITEMS_FOLDER = 'items/';
const COLLECTIBLES_FILE = 'collectibles.json';

/**
 * Every map target a quest names must be an interactable on its region's map, and shown while that quest's
 * chapter and the quest itself are played (`entitiesForChapter`). Active quests and drafts are both
 * checked (drafts are placed before they go live); stubs are skipped; a quest whose map is not generated
 * yet is reported as a note, not an error.
 */
export function checkQuestTargets(
  quests: Iterable<QuestDefinition>,
  worldDir: string = path.join(ASSETS_DIR, 'generated/world'),
  regions: RegionCatalog = RegionCatalog.parse(JSON.parse(readFileSync(path.join(CONTENT_DIR, REGIONS_FILE), 'utf8'))),
): { issues: string[]; notes: string[] } {
  const issues: string[] = [];
  const notes: string[] = [];
  // Hundreds of quests share a dozen maps: read and validate each map's entities once.
  const entitiesByMap = new Map<string, ReturnType<typeof worldEntitiesSchema.safeParse> | null>();
  const entitiesOf = (mapId: string) => {
    if (!entitiesByMap.has(mapId)) {
      const file = path.join(worldDir, mapId, 'entities.json');
      entitiesByMap.set(mapId, existsSync(file) ? worldEntitiesSchema.safeParse(JSON.parse(readFileSync(file, 'utf8'))) : null);
    }
    return entitiesByMap.get(mapId) ?? null;
  };
  for (const quest of quests) {
    if (quest.status === 'stub') continue;
    const mapId = mapForRegion(regions, quest.region);
    const parsed = entitiesOf(mapId);
    if (!parsed) {
      notes.push(`quest ${quest.id}: map targets not checked, region ${quest.region} chapter ${quest.chapter} has no generated map`);
      continue;
    }
    if (!parsed.success) {
      issues.push(`map ${mapId}: entities.json is not a valid version 2 world entities file`);
      continue;
    }
    const everywhere = new Set(parsed.data.interactables.map((t) => t.id));
    const onMap = new Map(entitiesForChapter(parsed.data, quest.chapter, quest.id).interactables.map((t) => [t.id, t]));
    // One character in one place at a time: entries that share a name must be one character (`character`).
    const castOf = new Map<string, string>();
    for (const t of onMap.values()) {
      if (t.kind !== 'npc') continue;
      const cast = t.character ?? t.id;
      const other = castOf.get(t.name);
      if (other === undefined) castOf.set(t.name, cast);
      else if (other !== cast) issues.push(`quest ${quest.id}: ${t.name} stands in the world twice (${other}, ${t.id}); name one as the other's "character" in content/${TARGETS_FILE}`);
    }
    for (const step of quest.steps) {
      for (const target of stepTargets(step)) {
        if (!everywhere.has(target)) issues.push(`quest ${quest.id} step ${step.id} targets ${target}, which map ${mapId} does not place`);
        else if (!onMap.has(target)) issues.push(`quest ${quest.id} step ${step.id} targets ${target}, which map ${mapId} hides in chapter ${quest.chapter}`);
      }
      // A side quest's giver offers its game, a storyteller its next chapter, a co-op host its team's lobby, whatever
      // lesson is played: it is in the world in every chapter.
      const opens = quest.category === 'side' || quest.category === 'story' || quest.category === 'coop';
      const giver = opens && step === quest.steps[0] && step.kind === 'dialogue' ? onMap.get(step.target ?? '') : undefined;
      if (giver && (giver.chapter !== undefined || giver.chapters !== undefined || giver.quest !== undefined)) {
        issues.push(`quest ${quest.id}: its giver ${giver.id} is only on map ${mapId} in some chapters or quests; the character a side quest or a story opens at is always in the world`);
      }
      // The map paints the riddle on a board: it must say what the step asks.
      const board = step.kind === 'riddle' && step.target ? onMap.get(step.target)?.board : undefined;
      if (step.kind === 'riddle' && board && !step.question.includes(board)) {
        issues.push(`quest ${quest.id} step ${step.id}: the board on ${step.target} reads "${board}", which the question does not contain`);
      }
    }
  }
  return { issues, notes };
}

/** Every string in a quest (titles, lines, prompts, support) must address the player as `{name}`. */
export function checkPlayerText(quests: Iterable<QuestDefinition>): string[] {
  const issues: string[] = [];
  for (const quest of quests) {
    const visit = (value: unknown, where: string): void => {
      if (typeof value === 'string') for (const issue of playerTextIssues(value)) issues.push(`quest ${quest.id} ${where} ${issue}`);
      else if (Array.isArray(value)) value.forEach((v, i) => visit(v, `${where}[${i}]`));
      else if (typeof value === 'object' && value !== null) for (const [k, v] of Object.entries(value)) visit(v, where ? `${where}.${k}` : k);
    };
    visit(quest, '');
  }
  return issues;
}

export interface ContentReport {
  issues: string[];
  /** Known gaps allowed for now (a textbook inventory still in draft), printed on every run. */
  warnings: string[];
  /** Checks deliberately not run yet, printed so a green run does not overstate what was verified. */
  notes: string[];
  fileCount: number;
}

function listFiles(dir: string, prefix = ''): string[] {
  return readdirSync(path.join(dir, prefix), { withFileTypes: true }).flatMap((entry) => {
    const rel = path.posix.join(prefix, entry.name);
    return entry.isDirectory() ? listFiles(dir, rel) : [rel];
  });
}

const inFolder = (rel: string, folder: string) => rel.startsWith(folder) && !rel.slice(folder.length).includes('/');
const readByCatalogue = (rel: string) =>
  CATALOGUE_FILES.some((o) => (o.endsWith('/') ? inFolder(rel, o) && rel.endsWith('.json') : rel === o));
const readByAssetTools = (rel: string) => ASSET_TOOL_FILES.some((o) => (o.endsWith('/') ? inFolder(rel, o) : rel === o));
const readByCurriculum = (rel: string) => CURRICULUM_FOLDERS.some((o) => inFolder(rel, o) && rel.endsWith('.json'));
const readByWeb = (rel: string) => rel === REGIONS_FILE || rel === MODELS_FILE || rel === LOOKS_FILE || rel === EMOJI_PROPS_FILE || rel === BOX_PROPS_FILE || rel === TARGETS_FILE || rel === PRIVACY_FILE || (inFolder(rel, ITEMS_FOLDER) && rel.endsWith('.json'));

/**
 * Items parse, use a shipped UI icon, file name = id, and every item a quest rewards exists. The collectible
 * sets (`content/collectibles.json`, loaded by the server catalogue) list items of kind `collectible` only, and
 * every such item belongs to a set.
 */
export function checkItems(
  dir: string,
  files: readonly string[],
  quests: Iterable<QuestDefinition>,
  collectibles: { sets: ReadonlyMap<string, CollectibleSet>; regions: ReadonlySet<string> },
): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  const kinds = new Map<string, { kind: string }>();
  for (const rel of files.filter((f) => inFolder(f, ITEMS_FOLDER) && f.endsWith('.json'))) {
    const parsed = Item.safeParse(JSON.parse(readFileSync(path.join(dir, rel), 'utf8')));
    if (!parsed.success) {
      issues.push(`content/${rel}: ${parsed.error.message}`);
      continue;
    }
    const item = parsed.data;
    if (`${ITEMS_FOLDER}${item.id}.json` !== rel) issues.push(`content/${rel}: file name must be ${item.id}.json`);
    if (!(item.icon in UI_ICONS)) issues.push(`item ${item.id} uses icon "${item.icon}", which the UI does not ship`);
    for (const text of [item.name, item.description, item.usedIn]) for (const issue of playerTextIssues(text)) issues.push(`item ${item.id} ${issue}`);
    ids.add(item.id);
    kinds.set(item.id, { kind: item.kind });
  }
  const catalog = { version: 1 as const, sets: [...collectibles.sets.values()] };
  issues.push(...collectibleIssues(catalog, { regions: collectibles.regions, items: kinds }).map((issue) => `content/${COLLECTIBLES_FILE}: ${issue}`));
  for (const quest of quests) {
    if (quest.status !== 'active') continue;
    for (const id of Object.keys(quest.reward.items)) if (!ids.has(id)) issues.push(`quest ${quest.id} rewards item ${id}, which content/items does not describe`);
  }
  return issues;
}

/** How many different things (characters, or objects by name) one look may draw across all lessons. */
export const LOOK_CAP = 6;

/**
 * Map target catalogues (read by the map generators): they parse, every target's look exists, every look's
 * model is licensed; a `character` names another entry of the same name drawn as a character; no look draws
 * more than LOOK_CAP different things, so lesson after lesson the child meets new things.
 */
export function checkTargetCatalogues(
  looksRaw: unknown,
  targetsRaw: unknown,
  manifestPaths: ReadonlySet<string>,
  knownSkills?: ReadonlySet<string>,
  knownQuests?: ReadonlySet<string>,
): string[] {
  const looks = LookCatalog.safeParse(looksRaw);
  if (!looks.success) return [`content/${LOOKS_FILE}: ${looks.error.message}`];
  const targets = QuestTargetCatalog.safeParse(targetsRaw);
  if (!targets.success) return [`content/${TARGETS_FILE}: ${targets.error.message}`];
  const issues: string[] = [];
  const all = targets.data.targets;
  for (const [id, look] of Object.entries(looks.data.looks)) if (look.model && !manifestPaths.has(look.model)) issues.push(`look ${id}: model ${look.model} is not in assets/manifest.json`);
  const drawn = new Map<string, Set<string>>();
  for (const [id, target] of Object.entries(all)) {
    const look = looks.data.looks[target.look];
    if (!look) {
      issues.push(`target ${id}: look ${target.look} is not in content/${LOOKS_FILE}`);
      continue;
    }
    if (target.character !== undefined) {
      const own = all[target.character];
      if (!own || own.character !== undefined || own.name !== target.name || looks.data.looks[own.look]?.kind !== 'npc') {
        issues.push(`target ${id}: character ${target.character} must be another entry named "${target.name}", drawn as a character, with no character of its own`);
      }
    }
    if (target.skillCheck) {
      if (knownSkills && !knownSkills.has(target.skillCheck.skill)) {
        issues.push(`target ${id}: skillCheck references unknown skill "${target.skillCheck.skill}"`);
      }
      if (target.skillCheck.hintQuest && knownQuests && !knownQuests.has(target.skillCheck.hintQuest)) {
        issues.push(`target ${id}: skillCheck hintQuest "${target.skillCheck.hintQuest}" is not in the quest catalogue`);
      }
    }
    const thing = look.kind === 'npc' ? `npc:${target.character ?? id}` : `object:${target.name}`;
    drawn.set(target.look, (drawn.get(target.look) ?? new Set()).add(thing));
  }
  for (const [look, things] of drawn) if (things.size > LOOK_CAP) issues.push(`look ${look} draws ${things.size} different things (at most ${LOOK_CAP}): give some of them a look of their own`);
  return issues;
}

/** Emoji props (built by tools/assets/build-emoji-props.ts): each has its picture, and each prop look has its prop. */
export function checkEmojiProps(raw: unknown, looksRaw: unknown, pictures: ReadonlySet<string>): string[] {
  const props = EmojiPropCatalog.safeParse(raw);
  if (!props.success) return [`content/${EMOJI_PROPS_FILE}: ${props.error.message}`];
  const issues: string[] = [];
  for (const [id, prop] of Object.entries(props.data.props)) if (!pictures.has(prop.emoji)) issues.push(`emoji prop ${id}: no picture props/${prop.emoji}.png in the fluent-emoji pack (sources.json)`);
  const looks = LookCatalog.safeParse(looksRaw);
  for (const [id, look] of Object.entries(looks.success ? looks.data.looks : {})) {
    const prop = look.model?.match(/^generated\/props\/(.+)\.glb$/)?.[1];
    if (prop && !props.data.props[prop]) issues.push(`look ${id}: ${look.model} has no entry in content/${EMOJI_PROPS_FILE}`);
  }
  return issues;
}

/** Things of one lesson that the child tells apart by name (red, yellow, blue envelope) must not look alike. */
export function checkLessonLooks(quests: Iterable<QuestDefinition>, looksRaw: unknown, targetsRaw: unknown): string[] {
  const looks = LookCatalog.safeParse(looksRaw);
  const targets = QuestTargetCatalog.safeParse(targetsRaw);
  if (!looks.success || !targets.success) return [];
  const issues: string[] = [];
  for (const quest of quests) {
    if (quest.status === 'stub') continue;
    const names = new Map<string, Set<string>>();
    for (const id of new Set(quest.steps.flatMap((step) => stepTargets(step)))) {
      const target = targets.data.targets[id];
      if (!target || looks.data.looks[target.look]?.kind !== 'object') continue;
      names.set(target.look, (names.get(target.look) ?? new Set()).add(target.name));
    }
    for (const [look, set] of names) if (set.size > 1) issues.push(`quest ${quest.id}: ${[...set].join(', ')} all look like ${look}`);
  }
  return issues;
}

/**
 * Wearable items: quest unlocks name real quests, every slot offers enough items from level 1, and
 * every item has its Character Creator picture in the manifest.
 */
export function checkAccessories(items: Iterable<AccessoryItem>, questIds: ReadonlySet<string>, generatedPaths: ReadonlySet<string>): string[] {
  const list = [...items];
  const issues: string[] = [];
  for (const item of list) {
    const quest = item.unlock?.quest;
    if (quest && !questIds.has(quest)) issues.push(`accessory ${item.id} unlocks with unknown quest ${quest}`);
    if (!generatedPaths.has(accessoryArtPath(item.id))) issues.push(`accessory ${item.id} has no picture ${accessoryArtPath(item.id)}: run pnpm assets:accessories`);
  }
  for (const slot of ACCESSORY_SLOTS) {
    const open = openItemsInSlot(list, slot).length;
    if (open < MIN_OPEN_ITEMS[slot]) issues.push(`accessory slot ${slot} offers ${open} items from level 1, needs at least ${MIN_OPEN_ITEMS[slot]}`);
  }
  return issues;
}

/**
 * Every pet's model is a licensed file in the asset manifest (the build ships it, the game loads it), its
 * picture is rendered (`pnpm assets:pets`), and a colour variant only recolours swatches its model draws with.
 */
export function checkPets(
  raw: unknown,
  manifestPaths: ReadonlySet<string>,
  generatedPaths: ReadonlySet<string>,
  swatchesOf: (model: string) => ReadonlySet<string>,
): string[] {
  const parsed = PetCatalog.safeParse(raw);
  if (!parsed.success) return [`content/pets.json: ${parsed.error.message}`];
  return parsed.data.pets.flatMap((p) => {
    if (!manifestPaths.has(p.model)) return [`pet ${p.id}: model ${p.model} is not in assets/manifest.json`];
    const issues: string[] = [];
    if (!generatedPaths.has(petArtPath(p.id))) issues.push(`pet ${p.id}: no picture ${petArtPath(p.id)} (run pnpm assets:pets)`);
    const drawn = p.recolor ? swatchesOf(p.model) : new Set<string>();
    for (const swatch of Object.keys(p.recolor ?? {})) {
      if (!drawn.has(swatch)) issues.push(`pet ${p.id}: recolor names swatch ${swatch}, which ${p.model} never draws with`);
    }
    return issues;
  });
}

/**
 * Regions parse; their text addresses the player as `{name}`; active quests live in open regions, and every
 * open region has one, a generated map, a known music pool, and a guide (if any) from the targets catalogue.
 */
export function checkRegions(
  raw: unknown,
  quests: Iterable<QuestDefinition>,
  worldDir: string = path.join(ASSETS_DIR, 'generated/world'),
  targetIds: ReadonlySet<string> | null = null,
): string[] {
  const parsed = RegionCatalog.safeParse(raw);
  if (!parsed.success) return [`content/${REGIONS_FILE}: ${parsed.error.message}`];
  const issues: string[] = [];
  for (const region of parsed.data.regions) {
    for (const text of [region.name, region.tagline, region.subject ?? '', region.description ?? '']) for (const issue of playerTextIssues(text)) issues.push(`region ${region.id} ${issue}`);
  }
  for (const region of parsed.data.regions) {
    if (region.status === 'open' && region.map && !existsSync(path.join(worldDir, region.map, 'entities.json'))) issues.push(`region ${region.id}: map ${region.map} is not generated (assets/generated/world/${region.map})`);
    if (region.music && !(region.music in MUSIC_MOODS)) issues.push(`region ${region.id}: music ${region.music} is not a mood of the music catalogue`);
    if (region.guide && targetIds && !targetIds.has(region.guide)) issues.push(`region ${region.id}: guide ${region.guide} is not in content/${TARGETS_FILE}`);
  }
  const open = new Set(parsed.data.regions.filter((r) => r.status === 'open').map((r) => r.id));
  const played = new Set<string>();
  for (const quest of quests) {
    if (quest.status !== 'active') continue;
    played.add(quest.region);
    if (!open.has(quest.region)) issues.push(`quest ${quest.id} is in region ${quest.region}, which is not an open region`);
  }
  for (const id of open) if (!played.has(id)) issues.push(`open region ${id} has no active quest`);
  return issues;
}

/**
 * A quest tells its story where the child stands: its story text never names another region (a lesson moved
 * to a new map must not still say it happens in the forest). Story text is the summary, who / where / what
 * of the seven questions, the places, and each step's title, directions, lines and prompt. The textbook's
 * own wording (readings, choices, answers) and where the story goes next (the `next` step,
 * `sevenQuestions.next`) may name any region.
 */
export function checkRegionMentions(quests: Iterable<QuestDefinition>, regions: RegionCatalog): string[] {
  const names = regions.regions.filter((r) => !r.name.includes('{'));
  const issues: string[] = [];
  for (const quest of quests) {
    if (quest.status === 'stub') continue;
    const story: Array<[string, string]> = [['summary', quest.summary]];
    if (quest.sevenQuestions) {
      const { who, where, goal } = quest.sevenQuestions;
      story.push(['sevenQuestions.who', who], ['sevenQuestions.where', where], ['sevenQuestions.goal', goal]);
    }
    for (const [id, place] of Object.entries(quest.places ?? {})) story.push([`places.${id}`, place]);
    for (const step of quest.steps) {
      if (step.kind === 'next') continue;
      story.push([`step ${step.id} title`, step.title]);
      if ('goTo' in step && step.goTo) story.push([`step ${step.id} goTo`, step.goTo]);
      if ('prompt' in step && typeof step.prompt === 'string') story.push([`step ${step.id} prompt`, step.prompt]);
      if ('text' in step && typeof step.text === 'string') story.push([`step ${step.id} text`, step.text]);
      if ('lines' in step) step.lines.forEach((line, n) => story.push([`step ${step.id} line ${n + 1}`, line.text]));
    }
    for (const region of names.filter((r) => r.id !== quest.region)) {
      for (const [where, text] of story) if (text.includes(region.name)) issues.push(`quest ${quest.id} ${where} names ${region.name}, another region: tell the story where the quest is`);
    }
  }
  return issues;
}

/**
 * The home decor catalogue (content/home/decor.json) parses, and every style can be built: its models are
 * licensed and in the model catalogue (their height and look), its blocks are solid blocks the walk rules
 * treat as plain walls (painting a wall never opens or closes a way).
 */
export function checkHomeDecor(raw: unknown, manifestPaths: ReadonlySet<string>, catalogued: ReadonlySet<string>, blocks: ReadonlyMap<string, { solid?: boolean; liquid?: boolean; traversal?: string }>): string[] {
  const parsed = HomeDecorCatalog.safeParse(raw);
  if (!parsed.success) return [`content/home/decor.json: ${parsed.error.message}`];
  const issues: string[] = [];
  for (const slot of parsed.data.slots) {
    for (const option of slot.options) {
      for (const model of option.models ?? []) {
        if (!manifestPaths.has(model)) issues.push(`decor ${slot.id}/${option.id}: model ${model} is not in assets/manifest.json`);
        if (!catalogued.has(model)) issues.push(`decor ${slot.id}/${option.id}: model ${model} has no line in content/world/models.json`);
      }
      for (const [role, name] of Object.entries(option.blocks ?? {})) {
        const block = blocks.get(name);
        if (!block) issues.push(`decor ${slot.id}/${option.id}: ${role} block ${name} is not in content/blocks.json`);
        else if (block.solid === false || block.liquid || block.traversal) issues.push(`decor ${slot.id}/${option.id}: ${role} block ${name} must be a plain solid block`);
      }
    }
  }
  return issues;
}

/**
 * Every achievement asks for no more than the shipped game has (lessons, minigames, bosses, collectibles, gates,
 * levels) and shows a picture the UI ships; its wording follows the player's name rule.
 */
export function checkProgression(
  dir: string,
  catalog: ContentCatalog,
  lessons: ReadonlyMap<string, number>,
  targets: Readonly<Record<string, { skillCheck?: { skill: string; hintQuest?: string } }>>,
): string[] {
  const active = [...catalog.quests.values()].filter((q) => q.status === 'active');
  // Gates a quest step opens (a gate no step reaches is never opened).
  const reached = new Set(active.flatMap((q) => q.steps.flatMap((step) => stepTargets(step))));
  const minigames = new Map([...questsByRegion(catalog.quests.values(), 'side')].map(([region, ids]) => [region, ids.length]));
  const parsed = AchievementCatalog.safeParse(JSON.parse(readFileSync(path.join(dir, 'progression/achievements.json'), 'utf8')));
  if (!parsed.success) return [`content/progression/achievements.json: ${parsed.error.message}`];
  const issues = achievementIssues(parsed.data, {
    regions: new Set([...lessons.keys(), ...minigames.keys()]),
    skills: catalog.skillIds,
    subjects: new Set(catalog.subjects.map((s) => s.id)),
    wearables: new Map([...catalog.accessories.values()].map((item) => [item.id, { award: item.unlock?.award === true }])),
    giftItems: new Set(catalog.skillGifts.items.map((i) => i.item)),
    icons: new Set(Object.keys(UI_ICONS)),
    reach: {
      lessons,
      minigames,
      bosses: active.filter((q) => q.steps.some((step) => step.kind === 'boss')).length,
      coop: active.filter((q) => q.category === 'coop').length,
      collectibles: [...catalog.collectibles.values()].reduce((sum, set) => sum + set.items.length, 0),
      collectionSets: catalog.collectibles.size,
      gates: Object.entries(targets).filter(([id, t]) => t.skillCheck !== undefined && reached.has(id)).length,
      skillLevels: catalog.skillCurve.thresholds.length,
      playerLevels: catalog.levelCurve.thresholds.length,
    },
  }).map((issue) => `content/progression/achievements.json: ${issue}`);
  for (const entry of parsed.data.achievements) {
    for (const text of [entry.name, entry.description]) for (const issue of playerTextIssues(text)) issues.push(`achievement ${entry.id} ${issue}`);
  }
  // A gate's practice quest trains the skill it asks for.
  for (const [id, target] of Object.entries(targets)) {
    const check = target.skillCheck;
    const hint = check?.hintQuest ? catalog.quests.get(check.hintQuest) : undefined;
    if (check && hint?.status === 'active' && !(check.skill in hint.reward.skillXp)) issues.push(`target ${id}: skillCheck hintQuest ${hint.id} does not train ${check.skill}`);
  }
  const top = catalog.skillCurve.thresholds.length;
  if (top !== MAX_SKILL_LEVEL) issues.push(`content/progression/skill-gifts.json: the skill curve has ${top} levels, the gifts cover ${MAX_SKILL_LEVEL}`);
  return issues;
}

/** The public privacy page parses and describes the consent version parents are asked to accept. */
export function checkPrivacy(raw: unknown, consentVersion: string): string[] {
  const parsed = PrivacyDocument.safeParse(raw);
  if (!parsed.success) return [`content/${PRIVACY_FILE}: ${parsed.error.message}`];
  if (parsed.data.consentVersion !== consentVersion) {
    return [`content/${PRIVACY_FILE} describes consent ${parsed.data.consentVersion}, but accounts are asked to accept ${consentVersion}: update the page with the consent`];
  }
  return [];
}

export function checkContent(dir: string = CONTENT_DIR): ContentReport {
  const issues: string[] = [];
  const files = listFiles(dir);
  for (const rel of files) {
    if (!readByCatalogue(rel) && !readByAssetTools(rel) && !readByWeb(rel) && !readByCurriculum(rel)) {
      issues.push(`content/${rel} has no validator: add it to the server catalogue or an asset tool`);
    }
  }
  const notes: string[] = [];
  const warnings: string[] = [];
  try {
    const catalog = loadContentCatalog({ dir, requireEveryMap: true });
    const regions = RegionCatalog.safeParse(JSON.parse(readFileSync(path.join(dir, REGIONS_FILE), 'utf8')));
    const targets = regions.success ? checkQuestTargets(catalog.quests.values(), undefined, regions.data) : { issues: [], notes: [] };
    issues.push(...targets.issues);
    // Drafts become game text too, so the player's name rule covers every quest file.
    issues.push(...checkPlayerText(readQuestDefinitions(path.join(dir, 'quests'))));
    const regionIds = new Set(regions.success ? regions.data.regions.map((r) => r.id) : []);
    issues.push(...checkItems(dir, files, catalog.quests.values(), { sets: catalog.collectibles, regions: regionIds }));
    // A broken targets file is reported by checkTargetCatalogues below; the guide check then waits for it.
    const targetCatalog = existsSync(path.join(dir, TARGETS_FILE)) ? QuestTargetCatalog.safeParse(JSON.parse(readFileSync(path.join(dir, TARGETS_FILE), 'utf8'))).data : undefined;
    const targetIds = targetCatalog ? new Set(Object.keys(targetCatalog.targets)) : null;
    issues.push(...checkRegions(JSON.parse(readFileSync(path.join(dir, REGIONS_FILE), 'utf8')), catalog.quests.values(), undefined, targetIds));
    if (regions.success) issues.push(...checkRegionMentions(readQuestDefinitions(path.join(dir, 'quests')), regions.data));
    const manifest = JSON.parse(readFileSync(path.join(ASSETS_DIR, 'manifest.json'), 'utf8')) as { files: Array<{ path: string }>; generated: Array<{ path: string }> };
    const petSwatches = new Map<string, ReadonlySet<string>>();
    const swatchesOf = (model: string): ReadonlySet<string> => {
      const known = petSwatches.get(model) ?? modelSwatches(path.join(ASSETS_DIR, model));
      petSwatches.set(model, known);
      return known;
    };
    const pets: unknown = JSON.parse(readFileSync(path.join(dir, 'pets.json'), 'utf8'));
    issues.push(...checkPets(pets, new Set(manifest.files.map((f) => f.path)), new Set(manifest.generated.map((f) => f.path)), swatchesOf));
    const read = (rel: string): unknown => JSON.parse(readFileSync(path.join(dir, rel), 'utf8'));
    const skillsFile = path.join(dir, 'learning/skills.json');
    const knownSkills = new Set<string>();
    if (existsSync(skillsFile)) {
      const skillsData = JSON.parse(readFileSync(skillsFile, 'utf8')) as { subjects?: Array<{ skills?: Array<{ id: string }> }> };
      for (const subj of skillsData.subjects ?? []) {
        for (const sk of subj.skills ?? []) knownSkills.add(sk.id);
      }
    }
    const knownQuests = new Set(catalog.quests.keys());
    if (existsSync(path.join(dir, TARGETS_FILE))) {
      issues.push(
        ...checkTargetCatalogues(
          read(LOOKS_FILE),
          read(TARGETS_FILE),
          new Set([...manifest.files, ...manifest.generated].map((f) => f.path)),
          knownSkills,
          knownQuests,
        ),
      );
      issues.push(...checkLessonLooks(readQuestDefinitions(path.join(dir, 'quests')), read(LOOKS_FILE), read(TARGETS_FILE)));
      // The child keeps moving and meets new characters: places per quest, stays per place, quests per character.
      const guides = regions.success ? regionGuides(regions.data) : {};
      issues.push(...questSpread(readQuestDefinitions(path.join(dir, 'quests')), read(TARGETS_FILE), read(LOOKS_FILE), guides).issues);
      const pictures = new Set(manifest.files.flatMap((f) => f.path.match(/^packs\/fluent-emoji\/[^/]+\/props\/(.+)\.png$/)?.[1] ?? []));
      issues.push(...checkEmojiProps(read(EMOJI_PROPS_FILE), read(LOOKS_FILE), pictures));
      if (existsSync(path.join(dir, MODELS_FILE))) {
        const models = modelCatalogSchema.safeParse(read(MODELS_FILE));
        if (!models.success) issues.push(`content/${MODELS_FILE}: ${models.error.message}`);
      }
      for (const rel of [BOX_PROPS_FILE, ...files.filter((f) => inFolder(f, BOX_PROPS_FOLDER) && f.endsWith('.json'))]) {
        const boxProps = BoxPropCatalog.safeParse(read(rel));
        if (!boxProps.success) issues.push(`content/${rel}: ${boxProps.error.message}`);
      }
    } else issues.push(`content/${TARGETS_FILE} is missing: the map generators place quest targets from it`);
    if (existsSync(path.join(dir, 'home/decor.json'))) {
      const models = modelCatalogSchema.safeParse(read(MODELS_FILE));
      const blockTable = read('blocks.json') as { blocks: Array<{ name: string; solid?: boolean; liquid?: boolean; traversal?: string }> };
      issues.push(
        ...checkHomeDecor(
          read('home/decor.json'),
          new Set([...manifest.files, ...manifest.generated].map((f) => f.path)),
          new Set(Object.keys(models.success ? models.data.models : {})),
          new Map(blockTable.blocks.map((b) => [b.name, b])),
        ),
      );
    }
    // The shop sells real wearables and home styles; its pictures are the web app's icons and minigame pictures.
    const decor = HomeDecorCatalog.safeParse(read('home/decor.json'));
    if (decor.success) loadShopCatalog(catalog.accessories, decor.data, dir, new Set([...Object.keys(UI_ICONS), ...Object.keys(SPRITE_PATHS)]));
    // Every open region has a chest of its own wearables, and lessons to earn it with.
    const lessons = new Map([...questsByRegion(catalog.quests.values(), 'main')].map(([region, ids]) => [region, ids.length]));
    loadRegionRewards(catalog.accessories, dir, lessons);
    issues.push(...checkProgression(dir, catalog, lessons, targetCatalog?.targets ?? {}));
    const privacy: unknown = JSON.parse(readFileSync(path.join(dir, PRIVACY_FILE), 'utf8'));
    issues.push(...checkPrivacy(privacy, catalog.consent.version));
    if (PrivacyDocument.safeParse(privacy).data?.contactEmail === null) warnings.push(`content/${PRIVACY_FILE} has no contact email yet`);
    issues.push(...checkAccessories(catalog.accessories.values(), new Set(catalog.quests.keys()), new Set(manifest.generated.map((f) => f.path))));
    if (existsSync(path.join(dir, 'olympiad/olympic-math.json'))) {
      const parsedOlympiad = OlympiadCatalog.safeParse(read('olympiad/olympic-math.json'));
      if (!parsedOlympiad.success) issues.push(`content/olympiad/olympic-math.json: ${parsedOlympiad.error.message}`);
    }
    if (existsSync(path.join(dir, 'mail/templates.json'))) {
      const parsedMail = MailCatalog.safeParse(read('mail/templates.json'));
      if (!parsedMail.success) issues.push(`content/mail/templates.json: ${parsedMail.error.message}`);
    }
    notes.push(...targets.notes);
  } catch (error) {
    issues.push(error instanceof Error ? error.message : String(error));
  }
  const curriculum = checkCurriculum(path.join(dir, 'curriculum'));
  issues.push(...curriculum.issues);
  // Textbook quests must carry the book's wording and answers unchanged, and no quest may repeat another's
  // lines; gaps only warn until the books are switched on.
  try {
    const quests = readQuestDefinitions(path.join(dir, 'quests'));
    const links = checkCurriculumLinks(curriculum.books, quests);
    issues.push(...links.issues);
    issues.push(...varietyIssues(quests, curriculum.books));
    for (const book of curriculum.books) {
      const totals = sumGaps(links.lessons.filter((l) => l.book === book.book.id));
      // Every exercise of a finished inventory must be in the game or on a worksheet (the textbook goal).
      if (totals.missing + totals.missingTexts > 0) {
        const line = `${book.book.id}: ${percentCovered(totals)}% of ${totals.items} textbook items covered by quests (pnpm content:gaps --missing)`;
        if (book.book.status === 'complete') issues.push(line);
        else warnings.push(line);
      }
    }
  } catch {
    // A quest file that breaks the schema is already reported by the catalogue load above.
  }
  return { issues, warnings: [...warnings, ...curriculum.warnings], notes, fileCount: files.length };
}

function main(): void {
  const report = checkContent();
  // The web app's bilingual dictionaries: every Vietnamese line has its English twin.
  report.issues.push(...checkLocales());
  for (const note of report.notes) console.log(`note: ${note}`);
  for (const warning of report.warnings) console.log(`warning: ${warning}`);
  if (report.issues.length > 0) {
    console.error(`content:check FAILED (${report.issues.length} problem(s)):`);
    for (const issue of report.issues) console.error(`  - ${issue}`);
    process.exit(1);
  }
  console.log(`content:check OK — ${report.fileCount} files`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
