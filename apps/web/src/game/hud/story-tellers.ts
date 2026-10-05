// The characters of a map who tell a story (content/npcs, `GET /npcs?region=`), for the minimap and the full map:
// where the next chapter is offered, like the minigames' givers. Read once per map; none when it cannot be read.
import { NpcListResponse } from '@miu/schema/npc';
import { ApiError, api } from '../../ui/api-client';
import type { StoryTeller } from './minimap-model';

/** The tellers in a list of characters, each with its next chapter (none once every chapter is finished). */
export function storyTellersOf(list: NpcListResponse, fill: (text: string) => string = (text) => text): StoryTeller[] {
  return list.npcs.flatMap((npc): StoryTeller[] => {
    if (npc.arcs.length === 0) return [];
    const arc = npc.offer ? npc.arcs.find((a) => a.id === npc.offer?.arcId) : undefined;
    const chapter = arc && npc.offer ? arc.chapters[npc.offer.part - 1] : undefined;
    return [{ targetIds: npc.targets, next: chapter ? fill(chapter.title.vi) : null }];
  });
}

/** The region's storytellers; none when the list cannot be read (offline, signed out, an older server). */
export async function fetchStoryTellers(region: string, fill?: (text: string) => string): Promise<StoryTeller[]> {
  try {
    return storyTellersOf(await api('GET', `/npcs?region=${encodeURIComponent(region)}`, NpcListResponse), fill);
  } catch (err) {
    if (!(err instanceof ApiError)) console.warn('storytellers for the map:', err);
    return [];
  }
}
