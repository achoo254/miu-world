// React side of the online bridge: a slice of the social store's snapshot, re-rendered only when it changes.
import { useSyncExternalStore } from 'react';
import type { SocialSnapshot, SocialStore } from '../../game-bridge/social-store';

export function useSocial<T>(social: SocialStore, select: (snapshot: SocialSnapshot) => T): T {
  return useSyncExternalStore(social.subscribe, () => select(social.getSnapshot()));
}
