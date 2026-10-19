// Loaded into the load test's own server process (`node --import tools/loadtest/loop-probe.ts`, see `host.ts`): once a
// second it prints one line with the process's CPU time, resident memory and event-loop delay. The server's code is not
// changed; the probe only watches. Its lines start with PROBE_PREFIX (keep it equal to `PROBE_PREFIX` in `host.ts`).
import { monitorEventLoopDelay } from 'node:perf_hooks';

const PROBE_PREFIX = 'loadtest-probe ';
const INTERVAL_MS = 1000;

const loop = monitorEventLoopDelay({ resolution: 10 });
loop.enable();
let lastCpu = process.cpuUsage();
let lastAt = Date.now();

const timer = setInterval(() => {
  const now = Date.now();
  const cpu = process.cpuUsage(lastCpu);
  lastCpu = process.cpuUsage();
  const sample = {
    t: now,
    elapsedMs: now - lastAt,
    cpuMs: (cpu.user + cpu.system) / 1000,
    rssMb: process.memoryUsage.rss() / 1048576,
    loopP50Ms: loop.percentile(50) / 1e6,
    loopP99Ms: loop.percentile(99) / 1e6,
    loopMaxMs: loop.max / 1e6,
  };
  lastAt = now;
  loop.reset();
  process.stdout.write(`${PROBE_PREFIX}${JSON.stringify(sample)}\n`);
}, INTERVAL_MS);
timer.unref();
