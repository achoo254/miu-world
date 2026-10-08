// The selected child's trophy room on the server (`GET /api/trophies`): her badges, cups and plaques, and when.
import { TrophyRoomResponse } from '@miu/schema/trophy-room';
import { api } from '../api-client';

/** The interactable before the trophy cabinet in her home (tools/world/structures/nha-cua-be-trophy-hall.ts). */
export const TROPHY_TARGET = 'nha-truyen-thong';

export function loadTrophies(): Promise<TrophyRoomResponse> {
  return api('GET', '/trophies', TrophyRoomResponse);
}
