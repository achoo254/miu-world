import { describe, expect, it } from 'vitest';
import { LIMITS, assertLoopbackUrl, cpuPercent, degradedBecause, parseMemoryFreePercent, parseSteps, percentile } from './loadtest-lib';

const healthy = { unexpectedCloses: 0, latencyP95Ms: 40, worstLoopP99Ms: 8, peakServerCpuPct: 35, clientLoopP99Ms: 4 };

describe('assertLoopbackUrl', () => {
  it('accepts this machine only', () => {
    expect(assertLoopbackUrl('http://127.0.0.1:8787').hostname).toBe('127.0.0.1');
    expect(assertLoopbackUrl('ws://localhost:8787/api/ws').hostname).toBe('localhost');
    expect(assertLoopbackUrl('http://[::1]:8787').hostname).toBe('[::1]');
  });

  it('refuses LAN, public and wildcard hosts', () => {
    expect(() => assertLoopbackUrl('http://192.168.1.20:8787')).toThrow(/non-loopback/);
    expect(() => assertLoopbackUrl('https://miu.hoandat.com')).toThrow(/non-loopback/);
    expect(() => assertLoopbackUrl('http://0.0.0.0:8787')).toThrow(/non-loopback/);
  });

  it('refuses other schemes even on loopback', () => {
    expect(() => assertLoopbackUrl('ftp://127.0.0.1:8787')).toThrow(/non-loopback/);
  });
});

describe('percentile', () => {
  it('uses the nearest rank', () => {
    const hundred = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentile(hundred, 50)).toBe(50);
    expect(percentile(hundred, 95)).toBe(95);
    expect(percentile(hundred, 99)).toBe(99);
    expect(percentile(hundred, 100)).toBe(100);
  });

  it('does not reorder its input and returns null when empty', () => {
    const values = [30, 10, 20];
    expect(percentile(values, 50)).toBe(20);
    expect(values).toEqual([30, 10, 20]);
    expect(percentile([], 95)).toBeNull();
  });
});

describe('cpuPercent', () => {
  it('reports the share of one core over the span', () => {
    expect(cpuPercent(500, 1000)).toBe(50);
    expect(cpuPercent(1200, 1000)).toBe(120);
    expect(cpuPercent(10, 0)).toBe(0);
  });
});

describe('parseMemoryFreePercent', () => {
  it('reads the free share from memory_pressure output', () => {
    expect(parseMemoryFreePercent('The system has 17179869184 (4194304 pages)\nSystem-wide memory free percentage: 37%')).toBe(37);
  });

  it('is null when the line is missing', () => {
    expect(parseMemoryFreePercent('command not understood')).toBeNull();
  });
});

describe('parseSteps', () => {
  it('reads a comma list of player counts', () => {
    expect(parseSteps('10,25, 50,100')).toEqual([10, 25, 50, 100]);
  });

  it('refuses empty, zero, too large and non-numeric steps', () => {
    expect(() => parseSteps('')).toThrow();
    expect(() => parseSteps('0')).toThrow();
    expect(() => parseSteps('501')).toThrow();
    expect(() => parseSteps('10,abc')).toThrow(/whole number/);
    expect(() => parseSteps('2.5')).toThrow(/whole number/);
  });
});

describe('degradedBecause', () => {
  it('is empty for a healthy step', () => {
    expect(degradedBecause(healthy)).toEqual([]);
  });

  it('names every limit that is passed', () => {
    const reasons = degradedBecause({
      unexpectedCloses: 2,
      latencyP95Ms: LIMITS.latencyP95Ms + 1,
      worstLoopP99Ms: LIMITS.loopP99Ms + 1,
      peakServerCpuPct: LIMITS.serverCpuPct + 1,
      clientLoopP99Ms: null,
    });
    expect(reasons).toHaveLength(4);
    expect(reasons[0]).toMatch(/closed by the server/);
  });

  it('flags a lagging load client as untrustworthy rather than as server load', () => {
    const reasons = degradedBecause({ ...healthy, clientLoopP99Ms: LIMITS.clientLoopP99Ms + 10 });
    expect(reasons).toHaveLength(1);
    expect(reasons[0]).toMatch(/not trustworthy/);
  });

  it('ignores readings that were not taken', () => {
    expect(degradedBecause({ unexpectedCloses: 0, latencyP95Ms: null, worstLoopP99Ms: null, peakServerCpuPct: null, clientLoopP99Ms: null })).toEqual([]);
  });
});
