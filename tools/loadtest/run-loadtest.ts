// `pnpm loadtest`: measures the multiplayer hub on this machine, against a server the run starts itself on
// 127.0.0.1:8787 (in-memory database, test password sign-in). Never production: there is no option to point it elsewhere.
//
// Scenarios:
//   room   (default) N fake players in the one room of trung-tam, where its 24 companion bots also live.
//   spread N fake players spread over the ten maps that have companion bots (the home map excluded): all 100 bots run.
//
// Each step is a fresh server: preflight (load, free memory, other heavy jobs, the port), N players sign up and join,
// a warm-up, then one measuring window (at most 60 s). Steps run in order and the run stops at the first degraded one.
// Output: a machine line, one row per step, and the reasons a step was degraded. Usage:
//   pnpm loadtest --scenario room --steps 10,25,50,100 --window 30
import { randomBytes } from 'node:crypto';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { BOT_MAP_CONFIGS } from '../../apps/server/src/multiplayer/bot-profiles';
import { LOADTEST_PORT, MAX_WINDOW_SECONDS, cpuPercent, degradedBecause, parseSteps, percentile, type StepReadings } from './loadtest-lib';
import { machineInfo, preflight, startServer, type ServerRun } from './host';
import { LoadMeter, openPlayer, type FakePlayer, type PlayerContext, type PlayerPlan } from './fake-player';

type Scenario = 'room' | 'spread';

const ROOM_MAP = 'trung-tam';
/** The home map runs one room per player (her home, her visitors): a separate case, not in these steps. */
const HOME_MAP = 'nha-cua-be';
const SPREAD_MAPS = Object.keys(BOT_MAP_CONFIGS).filter((mapId) => mapId !== HOME_MAP);
const DEFAULT_STEPS: Record<Scenario, string> = { room: '10,25,50,100', spread: '50,100' };
/** The dev origin the web app runs from (allowed by the server's default list). */
const ORIGIN = 'http://localhost:5173';
const CONNECT_CONCURRENCY = 8;
const PLAYER_FAILURE_SAMPLE = 3;

interface Options {
  scenario: Scenario;
  steps: number[];
  windowS: number;
  warmupS: number;
}

interface StepResult {
  scenario: Scenario;
  players: number;
  connected: number;
  setupFailures: string[];
  windowS: number;
  messagesPerS: number;
  kbPerS: number;
  kbPerPlayerS: number;
  cpuAvgPct: number | null;
  cpuPeakPct: number | null;
  rssPeakMb: number | null;
  loopP50Ms: number | null;
  loopWorstP99Ms: number | null;
  loopWorstMaxMs: number | null;
  latency: { n: number; p50: number | null; p95: number | null; p99: number | null };
  clientLoopP99Ms: number | null;
  clientCpuPct: number;
  unexpectedCloses: number;
  closeCodes: Record<string, number>;
  notices: Record<string, number>;
  bots: { seen: number; expected: number };
  degraded: string[];
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function argValue(args: readonly string[], name: string): string | undefined {
  const at = args.indexOf(name);
  if (at === -1) return undefined;
  const value = args[at + 1];
  if (value === undefined || value.startsWith('--')) throw new Error(`${name} needs a value`);
  return value;
}

function parseOptions(args: readonly string[]): Options {
  const scenario = argValue(args, '--scenario') ?? 'room';
  if (scenario !== 'room' && scenario !== 'spread') throw new Error(`--scenario is room or spread (got "${scenario}")`);
  const steps = parseSteps(argValue(args, '--steps') ?? DEFAULT_STEPS[scenario]);
  const windowS = Number(argValue(args, '--window') ?? 30);
  const warmupS = Number(argValue(args, '--warmup') ?? 10);
  if (!Number.isInteger(windowS) || windowS < 5 || windowS > MAX_WINDOW_SECONDS) throw new Error(`--window is 5 to ${MAX_WINDOW_SECONDS} seconds`);
  if (!Number.isInteger(warmupS) || warmupS < 0 || warmupS > 60) throw new Error('--warmup is 0 to 60 seconds');
  return { scenario, steps, windowS, warmupS };
}

/** Where each fake player stands: the room's map, or the spread over the bot maps (one watcher per map). */
function planPlayers(scenario: Scenario, count: number): PlayerPlan[] {
  const maps = scenario === 'room' ? [ROOM_MAP] : SPREAD_MAPS;
  const watched = new Set<string>();
  return Array.from({ length: count }, (_, index) => {
    const mapId = maps[index % maps.length] ?? ROOM_MAP;
    const home = BOT_MAP_CONFIGS[mapId]?.[0]?.home ?? { x: 0, y: 13, z: 0 };
    const watcher = !watched.has(mapId);
    watched.add(mapId);
    return { index, mapId, home, watcher };
  });
}

/** Companion bots the planned rooms hold (each map's configured bots). */
function expectedBots(plans: readonly PlayerPlan[]): number {
  const maps = new Set(plans.map((plan) => plan.mapId));
  return [...maps].reduce((sum, mapId) => sum + (BOT_MAP_CONFIGS[mapId]?.length ?? 0), 0);
}

async function policyVersion(baseUrl: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/consents/policy`, { headers: { Origin: ORIGIN } });
  if (!res.ok) throw new Error(`policy route answered ${res.status}`);
  const body = (await res.json()) as { version?: unknown };
  if (typeof body.version !== 'string') throw new Error('policy route has no version');
  return body.version;
}

let active: ServerRun | null = null;

async function runStep(scenario: Scenario, count: number, options: Options): Promise<StepResult> {
  const server = await startServer();
  active = server;
  const meter = new LoadMeter();
  const plans = planPlayers(scenario, count);
  const players: FakePlayer[] = [];
  const setupFailures: string[] = [];
  const clientLoop = monitorEventLoopDelay({ resolution: 10 });
  try {
    const ctx: PlayerContext = {
      baseUrl: server.baseUrl,
      origin: ORIGIN,
      policyVersion: await policyVersion(server.baseUrl),
      runId: randomBytes(4).toString('hex'),
      meter,
      emoteSentAt: new Map(),
    };
    for (let i = 0; i < plans.length; i += CONNECT_CONCURRENCY) {
      const batch = plans.slice(i, i + CONNECT_CONCURRENCY);
      await Promise.all(
        batch.map(async (plan) => {
          try {
            players.push(await openPlayer(ctx, plan));
          } catch (error) {
            if (setupFailures.length < PLAYER_FAILURE_SAMPLE) setupFailures.push(`player ${plan.index}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }),
      );
    }
    await sleep(options.warmupS * 1000);

    const cpuStart = process.cpuUsage();
    clientLoop.enable();
    const t0 = Date.now();
    meter.startWindow();
    await sleep(options.windowS * 1000);
    meter.stopWindow();
    const t1 = Date.now();
    clientLoop.disable();
    const clientCpu = process.cpuUsage(cpuStart);

    // Probe seconds that lie inside the window (a sample covers the `elapsedMs` before its time stamp).
    const inside = server.probes.filter((p) => p.t - p.elapsedMs >= t0 - 50 && p.t <= t1 + 50);
    const cpu = inside.map((p) => cpuPercent(p.cpuMs, p.elapsedMs));
    const windowS = (t1 - t0) / 1000;
    const kbPerS = meter.bytes / 1024 / windowS;
    const connected = players.length;
    const botsSeen = [...meter.botsByRoom.values()].reduce((sum, set) => sum + set.size, 0);
    const latencyP95 = percentile(meter.latenciesMs, 95);
    const clientLoopP99 = clientLoop.count > 0 ? clientLoop.percentile(99) / 1e6 : null;
    const readings: StepReadings = {
      unexpectedCloses: meter.unexpectedCloses,
      latencyP95Ms: latencyP95,
      worstLoopP99Ms: inside.length > 0 ? Math.max(...inside.map((p) => p.loopP99Ms)) : null,
      peakServerCpuPct: cpu.length > 0 ? Math.max(...cpu) : null,
      clientLoopP99Ms: clientLoopP99,
    };
    const degraded = [...degradedBecause(readings)];
    if (connected < count) degraded.push(`${count - connected} of ${count} players could not connect`);
    return {
      scenario,
      players: count,
      connected,
      setupFailures,
      windowS,
      messagesPerS: meter.messages / windowS,
      kbPerS,
      kbPerPlayerS: connected > 0 ? kbPerS / connected : 0,
      cpuAvgPct: cpu.length > 0 ? cpu.reduce((a, b) => a + b, 0) / cpu.length : null,
      cpuPeakPct: readings.peakServerCpuPct,
      rssPeakMb: inside.length > 0 ? Math.max(...inside.map((p) => p.rssMb)) : null,
      loopP50Ms: percentile(
        inside.map((p) => p.loopP50Ms),
        50,
      ),
      loopWorstP99Ms: readings.worstLoopP99Ms,
      loopWorstMaxMs: inside.length > 0 ? Math.max(...inside.map((p) => p.loopMaxMs)) : null,
      latency: { n: meter.latenciesMs.length, p50: percentile(meter.latenciesMs, 50), p95: latencyP95, p99: percentile(meter.latenciesMs, 99) },
      clientLoopP99Ms: clientLoopP99,
      clientCpuPct: cpuPercent((clientCpu.user + clientCpu.system) / 1000, t1 - t0),
      unexpectedCloses: meter.unexpectedCloses,
      closeCodes: Object.fromEntries([...meter.closeCodes].map(([code, n]) => [String(code), n])),
      notices: Object.fromEntries(meter.notices),
      bots: { seen: botsSeen, expected: expectedBots(plans) },
      degraded,
    };
  } finally {
    // Closes started here are not the server's doing: they must not count as dropped connections.
    meter.closing = true;
    for (const player of players) player.close();
    await sleep(300);
    await server.stop();
    active = null;
  }
}

const fmt = (value: number | null, digits = 0): string => (value === null ? '-' : value.toFixed(digits));

function printRow(result: StepResult): void {
  const verdict = result.degraded.length > 0 ? `degraded: ${result.degraded.join('; ')}` : 'ok';
  console.log(
    `| ${result.scenario} | ${result.players} | ${result.connected} | ${result.bots.seen}/${result.bots.expected} | ${fmt(result.messagesPerS)} | ${fmt(result.kbPerS)} | ${fmt(result.kbPerPlayerS, 2)} | ` +
      `${fmt(result.cpuAvgPct)} / ${fmt(result.cpuPeakPct)} | ${fmt(result.rssPeakMb)} | ${fmt(result.loopP50Ms, 1)} / ${fmt(result.loopWorstP99Ms, 1)} / ${fmt(result.loopWorstMaxMs, 1)} | ` +
      `${fmt(result.latency.p50)} / ${fmt(result.latency.p95)} / ${fmt(result.latency.p99)} (n=${result.latency.n}) | ${fmt(result.clientLoopP99Ms, 1)} | ${fmt(result.clientCpuPct)} | ${result.unexpectedCloses} | ${verdict} |`,
  );
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const machine = machineInfo();
  console.log(`machine: ${machine.cpu}, ${machine.cores} cores, ${machine.ramGb} GB RAM; server port ${LOADTEST_PORT} (local only)`);
  console.log(`scenario ${options.scenario}: steps ${options.steps.join(', ')}; warm-up ${options.warmupS} s; window ${options.windowS} s`);
  console.log('| Scenario | Players | Connected | Bots seen/expected | Msgs/s to clients | KB/s to clients | KB/s per player | Server CPU avg / peak % | Server RSS peak MB | Loop p50 / worst p99 / worst max ms | Emote latency p50 / p95 / p99 ms | Client loop p99 ms | Client CPU % | Closed by server | Verdict |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const count of options.steps) {
    await preflight();
    const result = await runStep(options.scenario, count, options);
    printRow(result);
    for (const failure of result.setupFailures) console.log(`  setup: ${failure}`);
    if (result.degraded.length > 0) {
      console.log(`stopped: the next steps are not run because ${result.degraded.join('; ')}`);
      break;
    }
  }
}

process.on('SIGINT', () => {
  const pending = active;
  if (!pending) process.exit(130);
  void pending.stop().finally(() => process.exit(130));
});

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  const pending = active;
  const exit = (): void => process.exit(1);
  if (pending) void pending.stop().finally(exit);
  else exit();
});
