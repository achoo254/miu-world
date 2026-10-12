// Where a lesson's clip is filmed: the region of the quest that plays the lesson, and the spot of the quest's first stop on
// that region's map. A quest file holds the answers, so this reads three things from it and nothing else: its lesson, its
// region and the ids of the places its steps go to; the clip shows the world, never a question.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { RegionCatalog } from '../../packages/schema/src/region';
import { worldEntitiesSchema } from '../../packages/voxel/src/world-entities';
import { ASSETS_DIR, REPO_ROOT } from '../assets/asset-lib';
import type { Vec3 } from './flight-path';

const CONTENT_DIR = path.join(REPO_ROOT, 'content');

export interface ClipScene {
  lessonId: string;
  questId: string;
  /** Region id (`cho-phien`), which the preview page takes as `region=`. */
  region: string;
  /** Chapter of the quest, which the preview page needs to show the quest's characters. */
  chapter: number;
  /** The map's folder under `assets/generated/world/`. */
  map: string;
  /** The ground at the quest's first stop. */
  center: Vec3;
}

const QuestPlaces = z.object({
  id: z.string(),
  status: z.string(),
  lesson: z.string().optional(),
  region: z.string(),
  chapter: z.number().int().min(1),
  steps: z.array(z.object({ target: z.string().optional() })),
});

/** The first step place that is on the map, by the place's position; null when none of the quest's places are. */
export function firstStop(stepTargets: readonly string[], positions: ReadonlyMap<string, Vec3>): Vec3 | null {
  for (const id of stepTargets) {
    const at = positions.get(id);
    if (at) return at;
  }
  return null;
}

/** The scene of a lesson: its active quest (the first by id when several play it). Throws when the lesson has no quest or no map to film. */
export function findClipScene(lessonId: string, contentDir: string = CONTENT_DIR, worldDir: string = path.join(ASSETS_DIR, 'generated/world')): ClipScene {
  const quest = readdirSync(path.join(contentDir, 'quests'))
    .filter((file) => file.endsWith('.json'))
    .sort()
    .flatMap((file) => {
      const parsed = QuestPlaces.safeParse(JSON.parse(readFileSync(path.join(contentDir, 'quests', file), 'utf8')));
      return parsed.success && parsed.data.status === 'active' && parsed.data.lesson === lessonId ? [parsed.data] : [];
    })[0];
  if (!quest) throw new Error(`lesson ${lessonId} has no active quest to film`);
  const regions = RegionCatalog.parse(JSON.parse(readFileSync(path.join(contentDir, 'world/regions.json'), 'utf8')));
  const map = regions.regions.find((r) => r.id === quest.region)?.map;
  if (!map) throw new Error(`quest ${quest.id}: region ${quest.region} has no map`);
  const entities = worldEntitiesSchema.parse(JSON.parse(readFileSync(path.join(worldDir, map, 'entities.json'), 'utf8')));
  const center = firstStop(
    quest.steps.flatMap((step) => (step.target ? [step.target] : [])),
    new Map(entities.interactables.map((i) => [i.id, i.position as Vec3])),
  );
  if (!center) throw new Error(`quest ${quest.id}: none of its places is on the map ${map}`);
  return { lessonId, questId: quest.id, region: quest.region, chapter: quest.chapter, map, center };
}
