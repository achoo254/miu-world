// The selected player's skill tree, journey and achievements on the server. Levels, progress and rewards are
// always the server's answer; claiming names the achievement only.
import { useCallback, useEffect, useState } from 'react';
import { AchievementClaimResponse, AchievementListResponse } from '@miu/schema/achievement';
import { JourneyResponse, type JourneyTab } from '@miu/schema/journey';
import { SkillTreeResponse } from '@miu/schema/progression';
import { api } from '../api-client';

export function loadSkillTree(): Promise<SkillTreeResponse> {
  return api('GET', '/skill-tree', SkillTreeResponse);
}

/** The journey; `tab` asks for that tab's newest events only. */
export function loadJourney(tab?: JourneyTab): Promise<JourneyResponse> {
  return api('GET', tab ? `/journey?tab=${tab}` : '/journey', JourneyResponse);
}

export function loadAchievements(): Promise<AchievementListResponse> {
  return api('GET', '/achievements', AchievementListResponse);
}

export function claimAchievement(id: string): Promise<AchievementClaimResponse> {
  return api('POST', `/achievements/${encodeURIComponent(id)}/claim`, AchievementClaimResponse);
}

/** A server read for a screen: its data, whether it failed, and a retry. */
export interface Loaded<T> {
  data: T | null;
  failed: boolean;
  retry: () => void;
  /** Replaces the data with a newer server answer (after a claim). */
  set: (data: T) => void;
}

/** `load` must keep its identity across renders (a module function or a memoised one); a new one loads again. */
export function useLoaded<T>(load: () => Promise<T>): Loaded<T> {
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    load()
      .then((body) => {
        if (alive) setData(body);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [load, attempt]);
  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((n) => n + 1);
  }, []);
  return { data, failed, retry, set: setData };
}
