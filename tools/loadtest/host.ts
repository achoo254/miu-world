// The machine and the server under test. `preflight` says whether a step may start (load, free memory, other heavy jobs,
// the fixed port). `startServer` runs a local server on 127.0.0.1:8787 with a minimal environment: the in-memory
// database, password sign-in for fake players, and the loop probe loaded in-process. It never reads production settings
// (no DATABASE_URL, no Google credentials), so the run cannot reach real data even if a shell exports them.
import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { createConnection } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOADTEST_PORT, assertLoopbackUrl, parseMemoryFreePercent } from './loadtest-lib';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SERVER_DIR = path.join(ROOT, 'apps/server');
const SERVER_ENTRY = path.join(SERVER_DIR, 'src/server.ts');
const PROBE = path.join(ROOT, 'tools/loadtest/loop-probe.ts');
/** Keep equal to `PROBE_PREFIX` in `loop-probe.ts`. */
const PROBE_PREFIX = 'loadtest-probe ';
const LOAD_LIMIT = 8;
const LOAD_WAIT_MS = 120_000;
const IDLE_WAIT_MS = 15 * 60_000;
const MIN_FREE_MEMORY_PCT = 30;
const HEAVY_JOBS = 'jest|vitest|npm ci|pnpm install|tsc|next build|vite build';
const BASE_URL = assertLoopbackUrl(`http://127.0.0.1:${LOADTEST_PORT}`).origin;

/** One second of the server process as the probe saw it. */
export interface ProbeSample {
  t: number;
  elapsedMs: number;
  cpuMs: number;
  rssMb: number;
  loopP50Ms: number;
  loopP99Ms: number;
  loopMaxMs: number;
}

export interface MachineInfo {
  cpu: string;
  cores: number;
  ramGb: number;
}

export function machineInfo(): MachineInfo {
  return { cpu: os.cpus()[0]?.model.trim() ?? 'unknown CPU', cores: os.cpus().length, ramGb: Math.round(os.totalmem() / 2 ** 30) };
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function run(file: string, args: string[]): Promise<{ code: number; stdout: string }> {
  return new Promise((resolve) => {
    execFile(file, args, (error, stdout) => {
      const code = error && typeof error.code === 'number' ? error.code : error ? 1 : 0;
      resolve({ code, stdout });
    });
  });
}

async function waitForLoad(): Promise<void> {
  const deadline = Date.now() + LOAD_WAIT_MS;
  for (;;) {
    const load = os.loadavg()[0] ?? 0;
    if (load <= LOAD_LIMIT) return;
    if (Date.now() > deadline) throw new Error(`load average ${load.toFixed(1)} is above ${LOAD_LIMIT} after two minutes; not starting`);
    console.log(`load average ${load.toFixed(1)} above ${LOAD_LIMIT}: waiting`);
    await sleep(5_000);
  }
}

async function freeMemoryPercent(): Promise<number> {
  const { stdout } = await run('memory_pressure', []);
  const free = parseMemoryFreePercent(stdout);
  if (free === null) throw new Error('cannot read free memory from memory_pressure; this check runs on macOS only');
  return free;
}

/** Process ids of heavy jobs on this machine, from any session (`pgrep` exits 1 when none match). */
async function heavyJobs(): Promise<string[]> {
  const { code, stdout } = await run('pgrep', ['-f', HEAVY_JOBS]);
  if (code === 1) return [];
  return stdout.split('\n').filter((pid) => pid.trim() !== '');
}

/** Waits while another session runs a heavy job (tests, installs, builds): one heavy job at a time on this machine. */
async function waitForIdleMachine(): Promise<void> {
  const deadline = Date.now() + IDLE_WAIT_MS;
  for (;;) {
    const busy = await heavyJobs();
    if (busy.length === 0) return;
    if (Date.now() > deadline) throw new Error(`${busy.length} heavy job(s) still running after 15 minutes (pids ${busy.join(', ')}); not starting`);
    console.log(`another heavy job is running (${busy.length} process(es)): waiting`);
    await sleep(15_000);
  }
}

function portInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

/** Refuses to start while the machine is busy; waits out a short load spike first. Throws with the reason. */
export async function preflight(): Promise<void> {
  await waitForLoad();
  const free = await freeMemoryPercent();
  if (free < MIN_FREE_MEMORY_PCT) throw new Error(`only ${free}% memory free (need ${MIN_FREE_MEMORY_PCT}%); not starting`);
  await waitForIdleMachine();
  if (await portInUse(LOADTEST_PORT)) {
    throw new Error(`port ${LOADTEST_PORT} is busy: stop the process that holds it (\`lsof -i :${LOADTEST_PORT}\`) and run again; this tool never moves to another port`);
  }
}

export interface ServerRun {
  /** Probe lines written so far (one per second of the server's life). */
  readonly probes: ProbeSample[];
  readonly baseUrl: string;
  stop(): Promise<void>;
}

function isProbeSample(value: unknown): value is ProbeSample {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return ['t', 'elapsedMs', 'cpuMs', 'rssMb', 'loopP50Ms', 'loopP99Ms', 'loopMaxMs'].every((key) => typeof v[key] === 'number');
}

async function waitForHealth(child: ChildProcess, tail: string[]): Promise<void> {
  const deadline = Date.now() + 60_000;
  let exited = false;
  child.once('exit', () => (exited = true));
  while (Date.now() < deadline) {
    if (exited) throw new Error(`server exited while starting:\n${tail.slice(-15).join('\n')}`);
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return;
    } catch {
      // not listening yet
    }
    await sleep(300);
  }
  throw new Error(`server did not answer /api/health within 60 s:\n${tail.slice(-15).join('\n')}`);
}

/** Starts the local test server and waits until it answers. The returned `stop` ends it (SIGTERM, then SIGKILL). */
export async function startServer(): Promise<ServerRun> {
  const env: Record<string, string> = {
    PATH: process.env.PATH ?? '',
    HOME: process.env.HOME ?? '',
    NODE_ENV: 'development',
    PORT: String(LOADTEST_PORT),
    PGLITE_DIR: 'memory',
    PASSWORD_LOGIN: '1',
    REGISTER_LIMIT_PER_HOUR: '100000',
  };
  const child = spawn(process.execPath, ['--import', 'tsx', '--import', PROBE, SERVER_ENTRY], { cwd: SERVER_DIR, env, stdio: ['ignore', 'pipe', 'pipe'] });
  const probes: ProbeSample[] = [];
  const tail: string[] = [];
  let buffered = '';
  child.stdout?.on('data', (chunk: Buffer) => {
    buffered += chunk.toString();
    const lines = buffered.split('\n');
    buffered = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith(PROBE_PREFIX)) {
        tail.push(line);
        continue;
      }
      const parsed: unknown = JSON.parse(line.slice(PROBE_PREFIX.length));
      if (isProbeSample(parsed)) probes.push(parsed);
    }
  });
  child.stderr?.on('data', (chunk: Buffer) => tail.push(...chunk.toString().split('\n')));
  await waitForHealth(child, tail);
  return {
    probes,
    baseUrl: BASE_URL,
    stop: () =>
      new Promise<void>((resolve) => {
        if (child.exitCode !== null || child.signalCode !== null) return resolve();
        const killer = setTimeout(() => child.kill('SIGKILL'), 8_000);
        child.once('exit', () => {
          clearTimeout(killer);
          resolve();
        });
        child.kill('SIGTERM');
      }),
  };
}
