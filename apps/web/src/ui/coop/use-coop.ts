// The co-op challenges a player can open: read once per visit (`GET /quests?category=coop`, how each is played,
// never its questions), and the hosts that open them. Talking to a host opens the team's lobby through the online
// session; everything after that comes from the server.
import { useCallback, useEffect, useRef, useState } from 'react';
import { QuestListResponse } from '@miu/schema/game';
import type { SocialStore } from '../../game-bridge/social-store';
import { api } from '../api-client';
import type { ActiveQuestView } from '../quest/quest-flow';
import { giverOf } from '../quest/side-quests';

export interface CoopChallenges {
  /** Every co-op challenge by id. */
  quests: ReadonlyMap<string, ActiveQuestView>;
  /** Takes a touched target when it hosts a co-op challenge (its lobby opens); false otherwise. */
  claim: (targetId: string) => boolean;
}

export function useCoopChallenges(social: SocialStore): CoopChallenges {
  const [quests, setQuests] = useState<ReadonlyMap<string, ActiveQuestView>>(new Map());
  useEffect(() => {
    let live = true;
    api('GET', '/quests?category=coop', QuestListResponse).then(
      (list) => {
        if (!live) return;
        setQuests(new Map(list.quests.flatMap((s) => (s.quest.status === 'active' ? [[s.quest.id, s.quest] as const] : []))));
      },
      // No co-op this visit (offline, an older server): the hosts just say hello.
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, []);
  const latest = useRef(quests);
  useEffect(() => {
    latest.current = quests;
  }, [quests]);
  const claim = useCallback(
    (targetId: string): boolean => {
      const quest = [...latest.current.values()].find((q) => giverOf(q) === targetId);
      if (!quest) return false;
      social.send({ type: 'coop', message: { type: 'coop-open', questId: quest.id } });
      return true;
    },
    [social],
  );
  return { quests, claim };
}
