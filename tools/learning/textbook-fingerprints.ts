// Fingerprints of the textbook wording the first learning quests were built from, so the content gate can refuse
// copied text without keeping the text itself. Each 7-word run (shingle) of the normalised wording is hashed with
// HMAC-SHA256 under a secret key and only the first 5 bytes are kept. The key matters: shingles overlap by six
// words, so with a plain hash anyone could rebuild the text word by word, guessing the next word and checking it
// against the file. Without the key nobody can test a guess. The key lives outside git (`MIU_FINGERPRINT_KEY`, the CI
// secret of the same name, or the owner's iCloud file below) and never changes: a new key needs the textbooks to
// rebuild the file, and they are removed from the repo.
//
//   pnpm exec tsx tools/learning/textbook-fingerprints.ts   (once, while content/curriculum still exists)
//
// Writes content/learning/textbook-fingerprints.bin: 5-byte big-endian hashes, sorted, no duplicates.
import { createHash, createHmac } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CONTENT_DIR } from '../../apps/server/src/content/content-dir';
import { icloudRoot } from '../private/sync-private';

export const SHINGLE_WORDS = 7;
const HASH_BYTES = 5;
export const FINGERPRINTS_FILE = path.join(CONTENT_DIR, 'learning/textbook-fingerprints.bin');

/** Where the key file sits in the owner's iCloud Drive, next to the project's other secrets. */
export const KEY_FILE_IN_ICLOUD = 'cong-viec/Cong viec/ENV production/miu-world/textbook-fingerprint.key';

/** The key (hex) from `MIU_FINGERPRINT_KEY`, else the iCloud file; null when neither is there. Never printed. */
export function fingerprintKey(env: NodeJS.ProcessEnv = process.env): Buffer | null {
  let hex = env.MIU_FINGERPRINT_KEY?.trim();
  if (!hex) {
    const root = icloudRoot(env);
    const file = root ? path.join(root, KEY_FILE_IN_ICLOUD) : null;
    if (file && existsSync(file)) hex = readFileSync(file, 'utf8').trim();
  }
  if (!hex) return null;
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw new Error('the textbook fingerprint key must be 64 hex characters');
  return Buffer.from(hex, 'hex');
}

/**
 * Words of a text as the fingerprints see them: lower case, every diacritic dropped (so "hoà" and "hòa", or a copy
 * typed without accents, look the same), đ as d, punctuation and symbols dropped.
 */
export function fingerprintWords(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

function hashShingle(words: readonly string[], key: Buffer): number {
  const digest = createHmac('sha256', key).update(words.join(' ')).digest();
  return digest.readUIntBE(0, HASH_BYTES);
}

/** Keyed hashes of every 7-word run of the text, in reading order (none for a text shorter than 7 words). */
export function shingleHashes(text: string, key: Buffer): number[] {
  const words = fingerprintWords(text);
  const hashes: number[] = [];
  for (let i = 0; i + SHINGLE_WORDS <= words.length; i += 1) hashes.push(hashShingle(words.slice(i, i + SHINGLE_WORDS), key));
  return hashes;
}

export function encodeFingerprints(hashes: Iterable<number>): Buffer {
  const sorted = [...new Set(hashes)].sort((a, b) => a - b);
  const out = Buffer.alloc(sorted.length * HASH_BYTES);
  sorted.forEach((h, i) => out.writeUIntBE(h, i * HASH_BYTES, HASH_BYTES));
  return out;
}

export function decodeFingerprints(data: Buffer): Set<number> {
  if (data.length % HASH_BYTES !== 0) throw new Error(`fingerprint file length ${data.length} is not a multiple of ${HASH_BYTES}`);
  const set = new Set<number>();
  for (let i = 0; i < data.length; i += HASH_BYTES) set.add(data.readUIntBE(i, HASH_BYTES));
  return set;
}

export function readFingerprints(file: string = FINGERPRINTS_FILE): Set<number> {
  return decodeFingerprints(readFileSync(file));
}

/** Every string inside a JSON value (keys left out). */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) strings(v, out);
  else if (typeof value === 'object' && value !== null) for (const v of Object.values(value)) strings(v, out);
  return out;
}

/** Wording of the inventory files and of the readings of the first learning quests. */
function textbookWording(contentDir: string): string[] {
  const texts: string[] = [];
  const curriculum = path.join(contentDir, 'curriculum');
  for (const book of readdirSync(curriculum)) {
    for (const file of readdirSync(path.join(curriculum, book)).filter((f) => f.endsWith('.json'))) {
      texts.push(...strings(JSON.parse(readFileSync(path.join(curriculum, book, file), 'utf8'))));
    }
  }
  const quests = path.join(contentDir, 'quests');
  for (const file of readdirSync(quests).filter((f) => /^(toan2|tv2)-.*\.json$/.test(f))) {
    const quest = JSON.parse(readFileSync(path.join(quests, file), 'utf8')) as { texts?: unknown };
    texts.push(...strings(quest.texts ?? {}));
  }
  return texts;
}

function main(): void {
  if (!existsSync(path.join(CONTENT_DIR, 'curriculum'))) throw new Error('content/curriculum is gone: the fingerprints were made before it was removed');
  const key = fingerprintKey();
  if (!key) throw new Error(`no fingerprint key: set MIU_FINGERPRINT_KEY or put it in iCloud Drive at ${KEY_FILE_IN_ICLOUD}`);
  const hashes = textbookWording(CONTENT_DIR).flatMap((text) => shingleHashes(text, key));
  const data = encodeFingerprints(hashes);
  writeFileSync(FINGERPRINTS_FILE, data);
  const sha = createHash('sha256').update(data).digest('hex');
  console.log(`${data.length / HASH_BYTES} shingle hashes (${hashes.length} shingles read), ${data.length} bytes, sha256 ${sha}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
