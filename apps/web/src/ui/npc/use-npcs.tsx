// The map's profiled characters in the game (content/npcs, `GET /npcs?region=`): a target the lesson has nothing
// for, when it is one of them, opens its card (npc-card.tsx) instead of a "not now" line; the chat is counted on
// the server (one a day raises the friendship). Read once per map, and again after a story chapter is finished.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { NpcDto, NpcLine } from '@miu/schema/npc';
import { say, type PlayerData } from '../player/player-data';
import { fetchNpcs, talkTo } from './npc-api';
import { NpcCard } from './npc-card';
import { nextLine } from './npc-lines';

interface Open {
  npcId: string;
  targetId: string;
  line: NpcLine | null;
  raised: boolean;
}

export interface Npcs {
  /** Opens the card of the character standing at this target; false when it is no profiled character. */
  claim: (targetId: string) => boolean;
  /** Reads the characters again (a chapter finished: hearts, offers and chapter states changed). */
  refresh: () => void;
  /** True while the card covers the game. */
  open: boolean;
  screens: ReactNode;
}

export function useNpcs({
  region,
  data,
  raining,
  hasGames,
  onGames,
  onStory,
}: {
  region: string;
  data: PlayerData;
  /** Rain falls where she plays now (the game's weather). */
  raining: boolean;
  /** Whether the character at a target offers minigames (side quests). */
  hasGames: (targetId: string) => boolean;
  /** Opens the character's minigames (the side quests' flow). */
  onGames: (targetId: string) => void;
  /** Plays a chapter of the character's story: the quest switches to it. */
  onStory: (questId: string, targetId: string) => void;
}): Npcs {
  const [npcs, setNpcs] = useState<NpcDto[]>([]);
  const [open, setOpen] = useState<Open | null>(null);
  /** What is left of the items given away, over the backpack's counts it was given from (a newer read replaces it). */
  const [given, setGiven] = useState<{ from: PlayerData['progress']['items']; left: Readonly<Record<string, number>> }>({ from: data.progress.items, left: {} });
  const owned = useMemo(() => (given.from === data.progress.items ? { ...data.progress.items, ...given.left } : data.progress.items), [data.progress.items, given]);
  const [reads, setReads] = useState(0);

  useEffect(() => {
    let live = true;
    fetchNpcs(region).then(
      (list) => live && setNpcs(list.npcs),
      // No characters this visit (offline, an older server): the lesson goes on as before.
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [region, reads]);

  const byTarget = useMemo(() => new Map(npcs.flatMap((npc) => npc.targets.map((t) => [t, npc] as const))), [npcs]);
  const latest = useRef({ byTarget, open, raining });
  useEffect(() => {
    latest.current = { byTarget, open, raining };
  });

  /**
   * The server's friendship and offer for a character, merged into its latest entry; a new heart opens lines (and
   * maybe its fear or secret) the server only sends a close friend, so the characters are read again.
   */
  const update = useCallback((id: string, friendship: NpcDto['friendship'], offer: NpcDto['offer']) => {
    let closer = false;
    setNpcs((list) =>
      list.map((n) => {
        if (n.id !== id) return n;
        closer = friendship.hearts > n.friendship.hearts;
        return { ...n, friendship, offer };
      }),
    );
    if (closer) setReads((r) => r + 1);
  }, []);

  const claim = useCallback(
    (targetId: string): boolean => {
      const { byTarget: known, open: shown, raining: wet } = latest.current;
      if (shown) return true;
      const npc = known.get(targetId);
      if (!npc) return false;
      const line = nextLine(npc.id, npc.lines, { now: new Date(), raining: wet, climate: npc.climate, hearts: npc.friendship.hearts });
      setOpen({ npcId: npc.id, targetId, line, raised: false });
      talkTo(npc.id).then(
        (response) => {
          update(npc.id, response.friendship, response.offer);
          if (response.raised) setOpen((o) => (o && o.npcId === npc.id ? { ...o, raised: true } : o));
        },
        // Offline: the chat still shows, the day's point is counted next time.
        () => undefined,
      );
      return true;
    },
    [update],
  );

  const npc = open ? npcs.find((n) => n.id === open.npcId) : undefined;
  const close = (): void => setOpen(null);
  return {
    claim,
    refresh: useCallback(() => setReads((n) => n + 1), []),
    open: open !== null,
    screens:
      open && npc ? (
        <NpcCard
          npc={npc}
          targetId={open.targetId}
          line={open.line}
          raised={open.raised}
          owned={owned}
          hasGames={hasGames(open.targetId)}
          fill={(text) => say(text, data.character)}
          onStory={(questId) => {
            close();
            onStory(questId, open.targetId);
          }}
          onGames={() => {
            close();
            onGames(open.targetId);
          }}
          onGift={(next, itemId, left) => {
            update(next.id, next.friendship, next.offer);
            setGiven((g) => ({ from: data.progress.items, left: { ...(g.from === data.progress.items ? g.left : {}), [itemId]: left } }));
          }}
          onClose={close}
        />
      ) : null,
  };
}
