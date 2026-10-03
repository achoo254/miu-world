// Every minigame, found by file: its description in content/minigames/<id>.json and its code in
// games/<id>/index.ts. Adding a game is adding those two files; nothing here is edited. The code of a game is
// loaded only when it is played (one small chunk per game).
import { MinigameSpec } from '@miu/schema/minigame';
import type { MinigameModule } from './define-minigame';

const SPEC_FILES = import.meta.glob<unknown>('../../../../../content/minigames/*.json', { eager: true, import: 'default' });
const GAME_FILES = import.meta.glob<{ default: MinigameModule }>('./games/*/index.ts');

const fileId = (file: string): string => file.split('/').at(-1)?.replace(/\.json$/, '') ?? file;
const folderId = (file: string): string => file.split('/').at(-2) ?? file;

/** Game descriptions by id, in the order of their names (the dev page's list). */
export const MINIGAME_SPECS: ReadonlyMap<string, MinigameSpec> = new Map(
  Object.entries(SPEC_FILES)
    .map(([file, raw]): [string, MinigameSpec] => [fileId(file), MinigameSpec.parse(raw)])
    .sort(([, a], [, b]) => a.name.localeCompare(b.name, 'vi')),
);

const LOADERS: ReadonlyMap<string, () => Promise<{ default: MinigameModule }>> = new Map(Object.entries(GAME_FILES).map(([file, load]) => [folderId(file), load]));

/** Ids of the game folders (games/<id>/index.ts). */
export const MINIGAME_CODE_IDS: readonly string[] = [...LOADERS.keys()].sort();

export async function loadMinigame(id: string): Promise<MinigameModule> {
  const load = LOADERS.get(id);
  if (!load) throw new Error(`unknown minigame ${id}`);
  return (await load()).default;
}
