// Pure helpers for the multiplayer load test (`run-loadtest.ts`): where it may point, how the readings are summed up,
// and when a step counts as degraded. No I/O here, so the rules are unit-tested (`loadtest-lib.test.ts`).

/** The port the test server always uses (the dev port, fixed in the config). */
export const LOADTEST_PORT = 8787;
/** One step never runs more fake players than this (the machine is shared; this is far above the planned steps). */
export const MAX_PLAYERS_PER_STEP = 500;
/** A measuring window is at most a minute, as the plan asks for short runs. */
export const MAX_WINDOW_SECONDS = 60;

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);

/** Any URL the test talks to must be on this machine. A LAN, public or unparsable host throws. */
export function assertLoopbackUrl(raw: string): URL {
  const url = new URL(raw);
  const protocolOk = ['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol);
  if (!protocolOk || !LOOPBACK_HOSTS.has(url.hostname)) {
    throw new Error(`refusing a non-loopback target (${url.protocol}//${url.hostname}); the load test runs against a local server only`);
  }
  return url;
}

/** Nearest-rank percentile of `values` (null when there are none). `p` is 0..100. */
export function percentile(values: readonly number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length, Math.max(1, Math.ceil((p / 100) * sorted.length)));
  return sorted[rank - 1] ?? null;
}

/** CPU share of one core over a span: 100 means one core busy the whole time. */
export function cpuPercent(cpuMs: number, elapsedMs: number): number {
  return elapsedMs > 0 ? (cpuMs / elapsedMs) * 100 : 0;
}

/** The free-memory share from macOS `memory_pressure` output (null when the line is missing). */
export function parseMemoryFreePercent(output: string): number | null {
  const found = /System-wide memory free percentage:\s*(\d+)%/.exec(output);
  return found ? Number(found[1]) : null;
}

/** `--steps 10,25,50`: whole numbers from 1 to MAX_PLAYERS_PER_STEP, at least one. */
export function parseSteps(raw: string): number[] {
  const steps = raw.split(',').map((part) => part.trim());
  const values = steps.map((part) => {
    const n = Number(part);
    if (!/^\d+$/.test(part) || n < 1 || n > MAX_PLAYERS_PER_STEP) {
      throw new Error(`a step must be a whole number from 1 to ${MAX_PLAYERS_PER_STEP} (got "${part}")`);
    }
    return n;
  });
  if (values.length === 0) throw new Error('give at least one step');
  return values;
}

/** Limits a step must stay under; past one of them the step is degraded and the larger steps are not run. */
export const LIMITS = {
  /** One-way emote delivery, 95th percentile (ms). A person waves and sees the wave within a blink. */
  latencyP95Ms: 150,
  /** Server event-loop delay, worst second's 99th percentile (ms): the tick lateness of the single thread. */
  loopP99Ms: 50,
  /** Server CPU, peak second, as a share of one core: the single thread is saturated near 100. */
  serverCpuPct: 90,
  /** The load client's own event-loop delay (ms): above this, the readings say more about the client. */
  clientLoopP99Ms: 50,
} as const;

export interface StepReadings {
  /** Connections the server closed during the window that the test did not close itself. */
  unexpectedCloses: number;
  latencyP95Ms: number | null;
  worstLoopP99Ms: number | null;
  peakServerCpuPct: number | null;
  clientLoopP99Ms: number | null;
}

/** Why a step is degraded (empty: healthy). The client line says the readings are not trustworthy. */
export function degradedBecause(r: StepReadings): string[] {
  const reasons: string[] = [];
  if (r.unexpectedCloses > 0) reasons.push(`${r.unexpectedCloses} connection(s) closed by the server during the window`);
  if (r.latencyP95Ms !== null && r.latencyP95Ms > LIMITS.latencyP95Ms) reasons.push(`emote latency p95 ${Math.round(r.latencyP95Ms)} ms above ${LIMITS.latencyP95Ms} ms`);
  if (r.worstLoopP99Ms !== null && r.worstLoopP99Ms > LIMITS.loopP99Ms) reasons.push(`server loop delay p99 ${Math.round(r.worstLoopP99Ms)} ms above ${LIMITS.loopP99Ms} ms`);
  if (r.peakServerCpuPct !== null && r.peakServerCpuPct > LIMITS.serverCpuPct) reasons.push(`server CPU peak ${Math.round(r.peakServerCpuPct)}% above ${LIMITS.serverCpuPct}%`);
  if (r.clientLoopP99Ms !== null && r.clientLoopP99Ms > LIMITS.clientLoopP99Ms) reasons.push(`load client itself lagging (loop p99 ${Math.round(r.clientLoopP99Ms)} ms): latency readings are not trustworthy`);
  return reasons;
}
