import { describe, expect, it } from 'vitest';
import { DEFAULT_SCRYPT, HashQueueFullError, hashSecret, verifySecret } from './secret-hashing';

const FAST = { logN: 10, r: 8, p: 1 };

describe('secret hashing', () => {
  it('verifies the right secret and rejects a wrong one', async () => {
    const stored = await hashSecret('test-password-1', FAST);
    expect(stored.startsWith('scrypt$10$8$1$')).toBe(true);
    expect(await verifySecret('test-password-1', stored)).toBe(true);
    expect(await verifySecret('test-password-2', stored)).toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hashSecret('1234', FAST)).not.toBe(await hashSecret('1234', FAST));
  });

  it('rejects malformed stored values instead of throwing', async () => {
    expect(await verifySecret('x', 'plain')).toBe(false);
    expect(await verifySecret('x', 'bcrypt$1$2$3$4$5')).toBe(false);
  });

  it('fails fast with a queue-full error instead of queueing without bound', async () => {
    const results = await Promise.allSettled(Array.from({ length: 40 }, () => hashSecret('1234', { logN: 12, r: 8, p: 1 })));
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(rejected.length).toBe(40 - 2 - 32);
    expect(rejected.every((r) => r.status === 'rejected' && r.reason instanceof HashQueueFullError)).toBe(true);
    // The queue drains: a later hash still works.
    expect(await verifySecret('1234', await hashSecret('1234', FAST))).toBe(true);
  });

  it('runs at production cost without exceeding the scrypt memory limit', async () => {
    const stored = await hashSecret('test-password-1', DEFAULT_SCRYPT);
    expect(stored.startsWith('scrypt$17$8$1$')).toBe(true);
    expect(await verifySecret('test-password-1', stored)).toBe(true);
  }, 20_000);
});
