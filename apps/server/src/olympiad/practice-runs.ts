// The right answers of each practice run under way, kept by the server (never told by the client) so a finished run
// is paid for what the server graded. In memory, like the co-op sessions: a run the server forgets (a restart, or
// one left for hours) is simply finished with nothing counted.

const RUN_TTL_MS = 3 * 60 * 60 * 1000;
/** Runs kept at most; the oldest go first past this (a few per player at a time is the norm). */
const MAX_RUNS = 5000;

interface Run {
  topic: string;
  correct: Set<string>;
  touched: number;
}

export class PracticeRuns {
  private readonly runs = new Map<string, Run>();

  constructor(private readonly now: () => number) {}

  private key(childId: string, runId: string): string {
    return `${childId}|${runId}`;
  }

  private sweep(): void {
    const at = this.now();
    for (const [key, run] of this.runs) if (at - run.touched > RUN_TTL_MS) this.runs.delete(key);
    while (this.runs.size > MAX_RUNS) {
      const oldest = this.runs.keys().next().value;
      if (oldest === undefined) break;
      this.runs.delete(oldest);
    }
  }

  /** A question of `topic` answered right in this run (a run stays on the topic it started with). */
  recordRight(childId: string, runId: string, topic: string, questionId: string): void {
    this.sweep();
    const key = this.key(childId, runId);
    const run = this.runs.get(key);
    if (run && run.topic !== topic) return;
    const next = run ?? { topic, correct: new Set<string>(), touched: 0 };
    next.correct.add(questionId);
    next.touched = this.now();
    // Re-inserted so the map keeps runs in the order they were last used (the oldest are evicted first).
    this.runs.delete(key);
    this.runs.set(key, next);
  }

  /** Right answers of a run of `topic`, and the run is over (a second call counts nothing). */
  finish(childId: string, runId: string, topic: string): number {
    const key = this.key(childId, runId);
    const run = this.runs.get(key);
    this.runs.delete(key);
    return run && run.topic === topic ? run.correct.size : 0;
  }
}
