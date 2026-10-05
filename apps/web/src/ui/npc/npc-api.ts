// The map's characters and the player's friendships (`/api/npcs`): the server counts every heart.
import { NpcGiftResponse, NpcListResponse, NpcTalkResponse } from '@miu/schema/npc';
import { api } from '../api-client';

/** Every profiled character, or one region's. */
export function fetchNpcs(region?: string): Promise<NpcListResponse> {
  return api('GET', region ? `/npcs?region=${encodeURIComponent(region)}` : '/npcs', NpcListResponse);
}

/** A chat with a character: the first of the day raises the friendship. */
export function talkTo(npcId: string): Promise<NpcTalkResponse> {
  return api('POST', `/npcs/${encodeURIComponent(npcId)}/talk`, NpcTalkResponse, {});
}

/** A gift of something the character likes (one a day; a collectible keeps one in the collection). */
export function giveTo(npcId: string, itemId: string): Promise<NpcGiftResponse> {
  return api('POST', `/npcs/${encodeURIComponent(npcId)}/gift`, NpcGiftResponse, { itemId });
}
