// The characters of a map who offer a minigame side quest (`GET /quests?category=side&region=`), for the
// minimap and the full map: who offers them (the target of each quest's first step, as the play screen's
// side-quest flow reads it) and the games' names (each quest's minigame step). Read once per map.
import { QuestListResponse } from '@miu/schema/game';
import { ApiError, api } from '../../ui/api-client';
import type { SideGiver } from './minimap-model';

/** The givers in a side-quest list, each once with every game it offers (in list order). */
export function sideGiversOf(list: QuestListResponse, fill: (text: string) => string = (text) => text): SideGiver[] {
  const games = new Map<string, string[]>();
  for (const { quest } of list.quests) {
    if (quest.status !== 'active') continue;
    const first = quest.steps[0];
    const giver = first && 'target' in first ? first.target : undefined;
    const game = quest.steps.find((s) => s.kind === 'challenge' && s.mechanic === 'minigame');
    if (!giver || !game) continue;
    const names = games.get(giver) ?? [];
    const name = fill(game.title);
    if (!names.includes(name)) names.push(name);
    games.set(giver, names);
  }
  return [...games].map(([targetId, names]) => ({ targetId, games: names }));
}

/** The region's givers; none when the list cannot be read (offline, signed out, an older server). */
export async function fetchSideGivers(region: string, fill?: (text: string) => string): Promise<SideGiver[]> {
  try {
    return sideGiversOf(await api('GET', `/quests?category=side&region=${encodeURIComponent(region)}`, QuestListResponse), fill);
  } catch (err) {
    // A list that does not parse is a bug worth seeing; a server that cannot be reached is not.
    if (!(err instanceof ApiError)) console.warn('side quests for the map:', err);
    return [];
  }
}
