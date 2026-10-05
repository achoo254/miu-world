// Friends over the API: the selected player's own lists (she answers and takes back requests), or a player's for
// the account owner (view, remove a friend, lift a block). Requests themselves are sent in a room, online.
import { z } from 'zod';
import { SocialView } from '@miu/schema/friends';
import { api } from '../api-client';

export interface SocialSource {
  load(): Promise<SocialView>;
  removeFriend(id: string): Promise<void>;
  unblock(id: string): Promise<void>;
  /** Only the player herself answers a request… */
  answer?(id: string, accept: boolean): Promise<SocialView>;
  /** …and takes back one of hers. */
  cancel?(id: string): Promise<void>;
}

const none = z.undefined();

export function answerFriendRequest(id: string, accept: boolean): Promise<SocialView> {
  return api('POST', `/friends/requests/${encodeURIComponent(id)}`, SocialView, { accept });
}

export const OWN_SOCIAL: SocialSource = {
  load: () => api('GET', '/friends', SocialView),
  removeFriend: (id) => api('DELETE', `/friends/${encodeURIComponent(id)}`, none),
  unblock: (id) => api('DELETE', `/blocks/${encodeURIComponent(id)}`, none),
  answer: answerFriendRequest,
  cancel: (id) => api('DELETE', `/friends/requests/${encodeURIComponent(id)}`, none),
};

/** One player's lists, for the account owner. */
export function accountSocial(playerId: string): SocialSource {
  const base = `/players/${encodeURIComponent(playerId)}`;
  return {
    load: () => api('GET', `${base}/friends`, SocialView),
    removeFriend: (id) => api('DELETE', `${base}/friends/${encodeURIComponent(id)}`, none),
    unblock: (id) => api('DELETE', `${base}/blocks/${encodeURIComponent(id)}`, none),
  };
}
