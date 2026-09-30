// Reads the character library from content/: base bodies, part libraries (one file per part kind),
// outfits (one file each), species recipes and, when present, outfit rules for an event.
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import {
  baseBodySchema,
  outfitRuleSchema,
  outfitSchema,
  partLibrarySchema,
  speciesSchema,
  type CharacterLibrary,
  type OutfitRule,
} from '../../packages/voxel/src/character-recipe';
import { REPO_ROOT, readJson } from './asset-lib';

const CONTENT_DIR = path.join(REPO_ROOT, 'content');
/** Absent unless an event re-dresses characters by tag; see `resolveOutfit`. */
export const OUTFIT_RULES_FILE = path.join(CONTENT_DIR, 'outfit-rules.json');

async function readFolder<T>(dir: string, schema: z.ZodType<T>): Promise<Record<string, T>> {
  const out: Record<string, T> = {};
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    out[path.basename(file, '.json')] = await readJson(path.join(dir, file), schema);
  }
  return out;
}

export async function readCharacterLibrary(): Promise<CharacterLibrary> {
  return {
    bases: await readJson(path.join(CONTENT_DIR, 'character-bases.json'), z.record(z.string(), baseBodySchema)),
    parts: await readFolder(path.join(CONTENT_DIR, 'character-parts'), partLibrarySchema),
    outfits: await readFolder(path.join(CONTENT_DIR, 'outfits'), outfitSchema),
    species: await readJson(path.join(CONTENT_DIR, 'species.json'), z.record(z.string(), speciesSchema)),
  };
}

export async function readOutfitRules(): Promise<OutfitRule[]> {
  return existsSync(OUTFIT_RULES_FILE) ? readJson(OUTFIT_RULES_FILE, z.array(outfitRuleSchema)) : [];
}
