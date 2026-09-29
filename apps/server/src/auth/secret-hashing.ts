import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/**
 * Password and parent-PIN hashing with `node:crypto` scrypt (no native dependency).
 * Stored format: `scrypt$<log2N>$<r>$<p>$<salt b64>$<hash b64>`, so cost can rise later without
 * invalidating existing hashes.
 */
export interface ScryptParams {
  /** log2 of the CPU/memory cost N. Production default 17 (N = 131072, ~128 MB per hash). */
  logN: number;
  r: number;
  p: number;
}

export const DEFAULT_SCRYPT: ScryptParams = { logN: 17, r: 8, p: 1 };

const KEY_LEN = 32;
const SALT_LEN = 16;
/** Concurrent hashes allowed; each can take ~128 MB, so an unbounded burst could exhaust memory. */
const MAX_CONCURRENT = 2;
/** Beyond this backlog requests fail fast instead of queueing without bound (memory + latency DoS). */
const MAX_WAITING = 32;

/** Thrown when the hash backlog is full; the HTTP layer answers 503. */
export class HashQueueFullError extends Error {
  constructor() {
    super('hash queue full');
    this.name = 'HashQueueFullError';
  }
}

let running = 0;
const waiting: Array<() => void> = [];

async function withHashSlot<T>(work: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONCURRENT) {
    if (waiting.length >= MAX_WAITING) throw new HashQueueFullError();
    // The finishing hash hands its slot straight to us, so `running` never exceeds the cap.
    await new Promise<void>((resolve) => waiting.push(resolve));
  } else {
    running += 1;
  }
  try {
    return await work();
  } finally {
    const next = waiting.shift();
    if (next) next();
    else running -= 1;
  }
}

function derive(secret: string, salt: Buffer, params: ScryptParams): Promise<Buffer> {
  const N = 2 ** params.logN;
  const options: ScryptOptions = {
    N,
    r: params.r,
    p: params.p,
    // Node's default maxmem is 32 MB; scrypt needs ~128 * N * r bytes, so N = 2^17 would throw.
    maxmem: 256 * 1024 * 1024 + 128 * N * params.r,
  };
  return withHashSlot(
    () =>
      new Promise<Buffer>((resolve, reject) => {
        scrypt(secret.normalize('NFKC'), salt, KEY_LEN, options, (err, key) => (err ? reject(err) : resolve(key)));
      }),
  );
}

export async function hashSecret(secret: string, params: ScryptParams): Promise<string> {
  const salt = randomBytes(SALT_LEN);
  const key = await derive(secret, salt, params);
  return ['scrypt', params.logN, params.r, params.p, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifySecret(secret: string, stored: string): Promise<boolean> {
  const [scheme, logN, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !logN || !r || !p || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await derive(secret, Buffer.from(salt, 'base64'), { logN: Number(logN), r: Number(r), p: Number(p) });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * A real hash of a random value, verified against when the email is unknown so a login attempt
 * costs the same time whether or not the account exists.
 */
export function decoyHash(params: ScryptParams): Promise<string> {
  return hashSecret(randomBytes(16).toString('hex'), params);
}
