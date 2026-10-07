// The quest target audit on small hand-built maps (each kind of finding) and on the committed forest map, where a
// picker without the step's preference must find what the owner met: the Olympic board's prompt taken by the arch.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { pickNearest } from '../../apps/web/src/game/entities/interactables';
import type { ActiveQuestView } from '../../apps/web/src/ui/quest/quest-flow';
import { QuestView } from '../../packages/schema/src/game';
import type { Interactable, WorldEntities } from '../../packages/voxel/src/world-entities';
import { REPO_ROOT } from '../assets/asset-lib';
import { auditQuest, auditQuestTargets, spotsByColumn, type AuditMap, type PromptPicker, type QuestTargetFinding } from './quest-target-audit';

const GROUND = 10;

const thing = (id: string, x: number, z: number, radius = 2, extra: Partial<Interactable> = {}): Interactable => ({
  id,
  kind: 'object',
  name: id,
  label: 'Xem',
  position: [x + 0.5, GROUND, z + 0.5],
  yaw: 0,
  radius,
  ...extra,
});

/** A flat 40 x 40 floor the child stands on everywhere, except inside `walls` and on the columns of `holes`. */
function flatMap(interactables: Interactable[], walls: Array<[number, number]> = [], holes: Array<[number, number]> = []): AuditMap {
  const wall = new Set(walls.map(([x, z]) => `${x},${z}`));
  const hole = new Set(holes.map(([x, z]) => `${x},${z}`));
  const spots: string[] = [];
  for (let x = 0; x < 40; x++) for (let z = 0; z < 40; z++) if (!wall.has(`${x},${z}`) && !hole.has(`${x},${z}`)) spots.push(`${x},${GROUND},${z}`);
  const entities: WorldEntities = { version: 2, id: 'test', seed: 1, size: [40, 32, 40], waterLevel: 0, spawn: { position: [1.5, GROUND, 1.5], yaw: 0 }, interactables, props: [], landmarks: [] };
  return {
    id: 'test',
    entities,
    columns: spotsByColumn(spots),
    solidAt: (x, y, z) => y < GROUND || (wall.has(`${x},${z}`) && y < GROUND + 4),
    blockingAt: () => false,
  };
}

function quest(steps: unknown[]): ActiveQuestView {
  const view = QuestView.parse({ id: 'q', region: 'r', chapter: 1, title: 'Q', status: 'active', summary: 'S', texts: {}, steps, reward: { xp: 10, coin: 1, skillXp: {}, items: {} } });
  if (view.status !== 'active') throw new Error('expected an active quest');
  return view;
}

const dialogue = (id: string, target: string) => ({ id, title: id, kind: 'dialogue', target, lines: [{ speaker: 'A', text: 'Chào bạn.' }] });
const search = (id: string, targets: string[]) => ({ id, title: id, kind: 'search', targets });
/** The picker before the step's other clues won the prompt: only the arrow's target is preferred. */
const arrowOnly: PromptPicker = (targets, at, preferred) => pickNearest(targets, at, preferred);

describe('quest target audit', () => {
  it("passes a search whose clues stand beside a character, since the step's clues win the prompt", () => {
    const map = flatMap([thing('clue-1', 10, 10), thing('clue-2', 20, 10), thing('dog', 21, 10, 3, { kind: 'npc' })]);
    expect(auditQuest(map, quest([search('find', ['clue-1', 'clue-2'])]), 1)).toEqual([]);
  });

  it("reports the second clue's prompt taken by a character beside it when only the arrow's target is preferred", () => {
    const map = flatMap([thing('clue-1', 10, 10), thing('clue-2', 20, 10), thing('dog', 21, 10, 3, { kind: 'npc' })]);
    const findings = auditQuest(map, quest([search('find', ['clue-1', 'clue-2'])]), 1, arrowOnly);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ step: 'find', target: 'clue-2', kind: 'stolen' });
    expect(findings[0]?.detail).toContain('dog');
  });

  it('reports a target inside a wall as covered', () => {
    const map = flatMap([thing('chest', 10, 10)], [[10, 10]]);
    expect(auditQuest(map, quest([dialogue('open', 'chest')]), 1).map((f) => f.kind)).toEqual(['covered']);
  });

  it('reports a target behind a wall from every spot within its radius as covered', () => {
    const ring: Array<[number, number]> = [];
    for (let x = 7; x <= 13; x++) for (let z = 7; z <= 13; z++) if (x === 7 || x === 13 || z === 7 || z === 13) ring.push([x, z]);
    const holes: Array<[number, number]> = [];
    for (let x = 8; x <= 12; x++) for (let z = 8; z <= 12; z++) if (x !== 10 || z !== 10) holes.push([x, z]);
    // Standing spots only outside the ring, 3.5 blocks out: a radius of 4 reaches them, the ring hides the chest.
    const map = flatMap([thing('chest', 10, 10, 4)], ring, [...holes, [10, 10]]);
    expect(auditQuest(map, quest([dialogue('open', 'chest')]), 1).map((f) => f.kind)).toEqual(['covered']);
  });

  it('reports a target no standing spot reaches', () => {
    const holes: Array<[number, number]> = [];
    for (let x = 27; x <= 33; x++) for (let z = 27; z <= 33; z++) holes.push([x, z]);
    const map = flatMap([thing('island-sign', 30, 30)], [], holes);
    expect(auditQuest(map, quest([dialogue('read', 'island-sign')]), 1).map((f) => f.kind)).toEqual(['unreachable']);
  });

  it('reports a clue the step takes while its character stands at the place the arrow points to', () => {
    // One owl met at two places: the arrow points at the first, so the second is hidden while the step still takes it.
    const map = flatMap([thing('owl', 10, 10, 2, { kind: 'npc' }), thing('owl-by-the-pond', 20, 20, 2, { kind: 'npc', character: 'owl' })]);
    const findings = auditQuest(map, quest([search('ask', ['owl', 'owl-by-the-pond'])]), 1);
    expect(findings.map((f) => [f.target, f.kind])).toEqual([['owl-by-the-pond', 'hidden']]);
  });
});

describe('quest target audit on the committed forest map', () => {
  const OLYMPIC = ['wonder-olympic-arithmetic', 'wonder-olympic-counting', 'wonder-olympic-logic', 'wonder-olympic-number', 'wonder-olympic-shapes'];
  let real: QuestTargetFinding[];
  let mutated: QuestTargetFinding[];
  const boardSteps = new Map<string, string>();

  beforeAll(async () => {
    real = await auditQuestTargets(['forest-ch1']);
    // A picker that prefers nothing: the rule as it was before the step's own target won the prompt.
    mutated = await auditQuestTargets(['forest-ch1'], (targets, at) => pickNearest(targets, at, null));
    for (const id of OLYMPIC) {
      const def = JSON.parse(await readFile(path.join(REPO_ROOT, 'content/quests', `${id}.json`), 'utf8')) as { steps: Array<{ id: string; target?: string }> };
      const step = def.steps.find((s) => s.target === 'ev-olympic-bang');
      if (step) boardSteps.set(id, step.id);
    }
  }, 60_000);

  it('finds nothing with the game picker', () => {
    expect(real).toEqual([]);
  });

  it("finds the board's prompt taken by the arch in all five Olympic quests when nothing is preferred", () => {
    expect([...boardSteps.keys()]).toEqual(OLYMPIC);
    for (const [questId, stepId] of boardSteps) {
      const hit = mutated.find((f) => f.quest === questId && f.step === stepId && f.target === 'ev-olympic-bang' && f.kind === 'stolen' && f.detail.includes('ev-olympic-vom'));
      expect(hit, `${questId} step ${stepId}`).toBeDefined();
    }
  });
});
