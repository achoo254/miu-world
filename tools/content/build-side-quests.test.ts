import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTENT_DIR } from '../../apps/server/src/content/content-catalog';
import { LookCatalog, QuestTargetCatalog, type TargetLook } from '../../packages/schema/src/world-target';
import { RegionCatalog } from '../../packages/schema/src/region';
import { buildSideQuests, giverLookId, promptWithGoal, readMinigameSpecs, vietnameseNumber, withLooks } from './build-side-quests';
import { readSideQuestTables, type SideQuestTable } from './side-quest-table';

const read = (rel: string): unknown => JSON.parse(readFileSync(path.join(CONTENT_DIR, rel), 'utf8'));
const specs = readMinigameSpecs();
const looks = LookCatalog.parse(read('world/looks.json')).looks;
const tables = readSideQuestTables();
/** Every side quest file: game → its region and giver. */
const sideFiles = new Map(
  readdirSync(path.join(CONTENT_DIR, 'quests'))
    .filter((f) => f.startsWith('side-'))
    .map((f) => {
      const q = read(`quests/${f}`) as { region: string; steps: Array<{ target?: string; game?: string }> };
      return [q.steps.find((s) => s.game)?.game ?? '', { region: q.region, giver: q.steps[0]?.target ?? '' }] as const;
    }),
);

describe('minigame side quests', () => {
  it('offers every minigame: one side quest per game', () => {
    const pending = new Set((JSON.parse(readFileSync(path.join(CONTENT_DIR, '../tools/content/pending-side-quest-games.json'), 'utf8')) as { games: string[] }).games);
    // Games still waiting for a giver are listed in pending-games.json; every other game has its side quest.
    expect([...pending].filter((id) => !specs.has(id) || sideFiles.has(id))).toEqual([]);
    expect([...sideFiles.keys(), ...pending].sort()).toEqual([...specs.keys()].sort());
  });

  it('writes the committed quest files from the tables (run build-side-quests.ts after editing a table)', () => {
    const { quests } = buildSideQuests(tables, specs, looks);
    for (const quest of quests) expect(read(`quests/${quest.id}.json`), quest.id).toEqual(JSON.parse(JSON.stringify(quest)));
  });

  it('catalogues every giver with its own look, a tinted one where the table tints it', () => {
    const targets = QuestTargetCatalog.parse(read('world/targets.json')).targets;
    const { givers, looks: tinted } = buildSideQuests(tables, specs, looks);
    for (const [id, giver] of givers) expect(targets[id], id).toEqual(giver);
    for (const [id, look] of tinted) expect(looks[id], id).toEqual(look);
  });

  it('gives every map at least eight games from several givers of two to four games each', () => {
    const regions = RegionCatalog.parse(read('world/regions.json')).regions.filter((r) => r.status === 'open');
    for (const region of regions) {
      const games = [...sideFiles.values()].filter((s) => s.region === region.id);
      const givers = new Set(games.map((s) => s.giver));
      expect(games.length, region.id).toBeGreaterThanOrEqual(8);
      expect(givers.size, region.id).toBeGreaterThanOrEqual(3);
    }
    for (const table of tables) for (const giver of table.givers) expect(giver.games.length, giver.id).toBeGreaterThanOrEqual(2);
  });

  it('refuses a game offered twice, an unknown game and a giver that is not a character', () => {
    const [first] = tables;
    if (!first) throw new Error('no side quest tables');
    const twice: SideQuestTable = { ...first, givers: [...first.givers, { ...(first.givers[0] as SideQuestTable['givers'][number]), id: 'ban-sao', name: 'Bản Sao' }] };
    expect(() => buildSideQuests([twice], specs, looks)).toThrow(/is offered twice/);
    const giver = first.givers[0] as SideQuestTable['givers'][number];
    const unknown: SideQuestTable = { ...first, givers: [{ ...giver, games: giver.games.map((g, i) => (i === 0 ? { ...g, game: 'no-such-game' } : g)) }] };
    expect(() => buildSideQuests([unknown], specs, looks)).toThrow(/no-such-game, which is not in content\/minigames/);
    const thing: SideQuestTable = { ...first, givers: [{ ...giver, look: 'memo', tint: undefined }] };
    expect(() => buildSideQuests([thing], specs, looks)).toThrow(/is not an npc look/);
  });
});

describe('goal in words', () => {
  it.each([
    [0, 'không'],
    [5, 'năm'],
    [10, 'mười'],
    [14, 'mười bốn'],
    [15, 'mười lăm'],
    [21, 'hai mươi mốt'],
    [24, 'hai mươi tư'],
    [25, 'hai mươi lăm'],
    [40, 'bốn mươi'],
    [100, 'một trăm'],
    [105, 'một trăm linh năm'],
    [150, 'một trăm năm mươi'],
    [180, 'một trăm tám mươi'],
    [1000, 'một nghìn'],
    [2025, 'hai nghìn không trăm hai mươi lăm'],
  ])('%i is "%s"', (n, words) => {
    expect(vietnameseNumber(n)).toBe(words);
  });

  it('puts the goal in the prompt, with a capital when it opens the sentence', () => {
    expect(promptWithGoal('Bắt {goal} con vịt nhé!', 10)).toBe('Bắt mười con vịt nhé!');
    expect(promptWithGoal('{goal} bàn là thắng!', 8)).toBe('Tám bàn là thắng!');
  });
});

describe('giver looks', () => {
  const look: TargetLook = { model: 'packs/kenney-cube-pets/2.0/animal-dog.glb', height: 1, kind: 'npc', label: 'Nói chuyện', animation: 'idle', tint: '#b8c8e8' };
  const file = '{\n "version": 1,\n "looks": {\n  "a": {\n   "height": 1.0\n  }\n }\n}\n';

  it('adds a tinted look at the end of the catalogue, keeping the hand-written entries as they are, once', () => {
    const once = withLooks(file, { a: { height: 1 } }, new Map([['animal-dog-cho-x', look]]));
    expect(once.startsWith('{\n "version": 1,\n "looks": {\n  "a": {\n   "height": 1.0\n  },\n  "animal-dog-cho-x": {\n   "model"')).toBe(true);
    expect(JSON.parse(once).looks['animal-dog-cho-x']).toEqual(look);
    const known = (JSON.parse(once) as { looks: Record<string, unknown> }).looks;
    expect(withLooks(once, known, new Map([['animal-dog-cho-x', look]]))).toBe(once);
    expect(() => withLooks(once, known, new Map([['animal-dog-cho-x', { ...look, tint: '#000000' }]]))).toThrow(/differs from its giver's table/);
  });

  it('names a tinted look after its base look and its giver', () => {
    expect(giverLookId({ id: 'cho-x', look: 'animal-dog', tint: '#b8c8e8' })).toBe('animal-dog-cho-x');
    expect(giverLookId({ id: 'cho-x', look: 'animal-dog' })).toBe('animal-dog');
  });
});
