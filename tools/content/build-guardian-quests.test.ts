import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTENT_DIR } from '../../apps/server/src/content/content-catalog';
import { GUARDIAN_TURNS, QuestDefinition } from '../../packages/schema/src/content';
import { RegionCatalog } from '../../packages/schema/src/region';
import { LookCatalog, QuestTargetCatalog } from '../../packages/schema/src/world-target';
import { GUARDIAN_LABEL, buildGuardianQuests, choiceOrder, guardianLookId, readGuardianContext } from './build-guardian-quests';
import { checkBossCoverage } from './check-content';
import { readGuardianTables, type GuardianTable } from './guardian-table';

const read = (rel: string): unknown => JSON.parse(readFileSync(path.join(CONTENT_DIR, rel), 'utf8'));
const tables = readGuardianTables();
const ctx = readGuardianContext();

describe('zone guardians', () => {
  it('writes the committed quest files from the tables (run build-guardian-quests.ts after editing a table)', () => {
    const { quests } = buildGuardianQuests(tables, ctx);
    for (const quest of quests) expect(read(`quests/${quest.id}.json`), quest.id).toEqual(JSON.parse(JSON.stringify(quest)));
    // Every ward- quest comes from a table.
    const files = readdirSync(path.join(CONTENT_DIR, 'quests')).filter((f) => f.startsWith('ward-'));
    expect(files.sort()).toEqual(quests.map((q) => `${q.id}.json`).sort());
  });

  it('catalogues every guardian with its own look and the challenge label', () => {
    const targets = QuestTargetCatalog.parse(read('world/targets.json')).targets;
    const looks = LookCatalog.parse(read('world/looks.json')).looks;
    const built = buildGuardianQuests(tables, ctx);
    for (const [id, entry] of built.guardians) {
      expect(targets[id], id).toEqual(entry);
      expect(entry.label).toBe(GUARDIAN_LABEL);
    }
    for (const [id, look] of built.looks) expect(looks[id], id).toEqual(look);
  });

  it('gives every open map three or four guardians, each a short fight of four or five questions that pays every replay', () => {
    const regions = RegionCatalog.parse(read('world/regions.json')).regions.filter((r) => r.status === 'open');
    const { quests } = buildGuardianQuests(tables, ctx);
    for (const region of regions) {
      const here = quests.filter((q) => q.region === region.id);
      expect(here.length, region.id).toBeGreaterThanOrEqual(3);
      expect(here.length, region.id).toBeLessThanOrEqual(4);
    }
    expect(quests.length).toBeGreaterThanOrEqual(36);
    expect(quests.length).toBeLessThanOrEqual(48);
    for (const quest of quests) {
      const parsed = QuestDefinition.parse(quest);
      if (parsed.status !== 'active') throw new Error(`${quest.id} is not active`);
      const boss = parsed.steps.find((s) => s.kind === 'boss');
      if (boss?.kind !== 'boss') throw new Error(`${quest.id} has no boss`);
      expect(boss.turns.length).toBeGreaterThanOrEqual(GUARDIAN_TURNS.min);
      expect(boss.turns.length).toBeLessThanOrEqual(GUARDIAN_TURNS.max);
      expect(parsed.reward.xp, quest.id).toBeGreaterThan(0);
      expect(parsed.reward.coin, quest.id).toBeGreaterThan(0);
    }
  });

  it('spreads the right answer over the choices: no place holds more than half of them', () => {
    const { quests } = buildGuardianQuests(tables, ctx);
    const at = new Map<number, number>();
    let turns = 0;
    for (const quest of quests) {
      const parsed = QuestDefinition.parse(quest);
      if (parsed.status !== 'active') continue;
      for (const step of parsed.steps) {
        if (step.kind !== 'boss') continue;
        for (const turn of step.turns) {
          const place = turn.choices.findIndex((c) => c.id === turn.answer.choice);
          expect(place, `${quest.id} ${turn.id}`).toBeGreaterThanOrEqual(0);
          expect(turn.en?.choices.length).toBe(turn.choices.length);
          at.set(place, (at.get(place) ?? 0) + 1);
          turns++;
        }
      }
    }
    for (const [place, n] of at) expect(n / turns, `answer at place ${place}`).toBeLessThanOrEqual(0.5);
  });

  it("keeps each choice beside its English label and the answer on the right choice after the shuffle", () => {
    const [table] = tables;
    const g = table?.guardians[0];
    const turn = g?.turns[0];
    if (!table || !g || !turn) throw new Error('no guardian tables');
    const quest = QuestDefinition.parse(buildGuardianQuests(tables, ctx).quests.find((q) => q.id === g.quest));
    if (quest.status !== 'active') throw new Error('not active');
    const boss = quest.steps.find((s) => s.kind === 'boss');
    const built = boss?.kind === 'boss' ? boss.turns.find((t) => t.id === turn.id) : undefined;
    if (!built) throw new Error('no turn');
    expect(built.choices.find((c) => c.id === built.answer.choice)?.text).toBe(turn.choices[turn.answer]);
    built.choices.forEach((c, i) => expect(built.en?.choices[i]).toBe(turn.en.choices[turn.choices.indexOf(c.text)]));
    expect(choiceOrder('x', 3)).toEqual(choiceOrder('x', 3));
  });

  it("gives every question the table's Hướng dẫn, Gợi ý and explained Đáp án in both languages, the answer naming the right choice", () => {
    const { quests } = buildGuardianQuests(tables, ctx);
    let questions = 0;
    for (const table of tables) {
      for (const g of table.guardians) {
        const boss = quests.find((q) => q.id === g.quest && q.status === 'active');
        const step = boss?.status === 'active' ? boss.steps.find((s) => s.kind === 'boss') : undefined;
        if (step?.kind !== 'boss') throw new Error(`${g.quest}: no boss`);
        for (const turn of g.turns) {
          const built = step.turns.find((t) => t.id === turn.id);
          expect(built?.support, `${g.quest} ${turn.id}`).toEqual({
            guide: turn.guide,
            hint: turn.hint,
            answer: { text: turn.choices[turn.answer], explanation: turn.explain },
            en: { guide: turn.en.guide, hint: turn.en.hint, answer: { text: turn.en.choices[turn.answer], explanation: turn.en.explain } },
          });
          questions += 1;
        }
      }
    }
    expect(questions).toBeGreaterThanOrEqual(36 * GUARDIAN_TURNS.min);
  });

  it('draws each guardian from lessons of its own map, and asks about the skills those lessons train', () => {
    for (const table of tables) {
      for (const g of table.guardians) {
        for (const lesson of g.lessons) expect(ctx.lessons.get(lesson), `${g.id} ${lesson}`).toBe(table.region);
        const quest = read(`quests/${g.quest}.json`) as { reward: { skillXp: Record<string, number> } };
        expect(Object.keys(quest.reward.skillXp).sort()).toEqual([...new Set(g.turns.map((t) => t.skill))].sort());
      }
    }
  });

  it('never repeats a line of a guardian in another guardian', () => {
    const lines = new Map<string, string>();
    for (const table of tables) {
      for (const g of table.guardians) {
        for (const line of [...g.hook, g.intro, g.win, ...g.right, ...g.wrong, g.reward, g.next, ...g.en.hook, g.en.intro, g.en.win, ...g.en.right, ...g.en.wrong, g.en.reward, g.en.next]) {
          expect(lines.get(line), `${g.id}: "${line}"`).toBeUndefined();
          lines.set(line, g.id);
        }
      }
    }
  });

  it('refuses a guardian with no place to stand, a lesson of another map, an unknown skill or a shared name', () => {
    const [first] = tables;
    const guardian = first?.guardians[0];
    if (!first || !guardian) throw new Error('no guardian tables');
    const withGuardian = (g: GuardianTable['guardians'][number]): GuardianTable[] => [{ ...first, guardians: [g] }];
    const noAnchors = { ...ctx, sideTables: ctx.sideTables.map((t) => ({ ...t, guardians: [] })) };
    expect(() => buildGuardianQuests(withGuardian(guardian), noAnchors)).toThrow(/has no place to stand/);
    const elsewhere = [...ctx.lessons].find(([, region]) => region !== first.region)?.[0] ?? '';
    expect(() => buildGuardianQuests(withGuardian({ ...guardian, lessons: [elsewhere] }), ctx)).toThrow(/is not a lesson of/);
    const turn = guardian.turns[0];
    if (!turn) throw new Error('no turn');
    expect(() => buildGuardianQuests(withGuardian({ ...guardian, turns: [{ ...turn, skill: 'khong-co' }, ...guardian.turns.slice(1)] }), ctx)).toThrow(/unknown skill/);
    const second = first.guardians[1];
    if (!second) throw new Error('fixture');
    expect(() => buildGuardianQuests([{ ...first, guardians: [guardian, { ...second, name: guardian.name }] }], ctx)).toThrow(/are both called/);
    expect(guardianLookId(guardian)).toBe(`${guardian.look}-${guardian.id}`);
  });
});

describe('boss coverage of the maps', () => {
  // One real open region, alone in the catalogue.
  const raw = read('world/regions.json') as { version: number; regions: Array<{ id: string; status: string }> };
  const region = raw.regions.find((r) => r.status === 'open');
  if (!region) throw new Error('no open region');
  const regions = { ...raw, regions: [region] };
  const quest = (id: string, category: string, target: string) => ({ id, region: region.id, status: 'active', category, steps: [{ kind: 'boss', target }] }) as unknown as QuestDefinition;

  it('asks every open map for a big boss and three zone guardians', () => {
    expect(checkBossCoverage(regions, [quest('ward-a', 'guardian', 'a')]).issues).toEqual([
      `region ${region.id} has no big boss: a lesson of every map ends in a boss fight`,
      `region ${region.id} has 1 zone guardian(s), needs at least 3 (one for each main zone)`,
    ]);
    const enough = checkBossCoverage(regions, [quest('vuot-ai-x', 'main', 'big'), quest('ward-a', 'guardian', 'a'), quest('ward-b', 'guardian', 'b'), quest('ward-c', 'guardian', 'c')]);
    expect(enough.issues).toEqual([]);
    expect(enough.counts.get(region.id)).toEqual({ big: 1, guardians: 3 });
  });

  it('makes each guardian its own character', () => {
    const twice = checkBossCoverage(regions, [quest('vuot-ai-x', 'main', 'big'), quest('ward-a', 'guardian', 'a'), quest('ward-b', 'guardian', 'b'), quest('ward-c', 'guardian', 'a')]);
    expect(twice.issues).toEqual(['zone guardians ward-a and ward-c are the same character (a): each guardian is its own']);
  });
});
