// Weekly play time for the progress views: while the play screen is shown and not paused, a minute of play is
// reported to the server every minute. Only the total per week is kept (no session or event log); a failed
// report is simply lost, like a missed second on a stopwatch.
import { useEffect, useRef } from 'react';
import { z } from 'zod';
import { PLAY_BEAT_SECONDS } from '@miu/schema/progress';
import { api } from '../api-client';

/** How often the screen checks whether she is playing (seconds). */
const TICK_SECONDS = 15;

export function reportPlayTime(seconds: number): Promise<void> {
  return api('POST', '/play-time', z.undefined(), { seconds });
}

/** Counts time while `playing` and the page is visible; reports each full beat. */
export function usePlayTime(playing: boolean, report: (seconds: number) => Promise<void> = reportPlayTime): void {
  const playingRef = useRef(playing);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    let counted = 0;
    const timer = window.setInterval(() => {
      if (!playingRef.current || document.visibilityState !== 'visible') return;
      counted += TICK_SECONDS;
      if (counted < PLAY_BEAT_SECONDS) return;
      counted -= PLAY_BEAT_SECONDS;
      report(PLAY_BEAT_SECONDS).catch(() => undefined);
    }, TICK_SECONDS * 1000);
    return () => window.clearInterval(timer);
  }, [report]);
}
