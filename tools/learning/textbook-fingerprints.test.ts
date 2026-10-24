import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FINGERPRINTS_FILE, decodeFingerprints, encodeFingerprints, fingerprintKey, fingerprintWords, readFingerprints, shingleHashes } from './textbook-fingerprints';

const KEY = Buffer.alloc(32, 7);

describe('textbook fingerprints', () => {
  it('see bare words: case, punctuation, spacing and diacritics do not matter', () => {
    expect(fingerprintWords('  Ngày khai trường   đã ĐẾN!\n“Con muốn…”')).toEqual(['ngay', 'khai', 'truong', 'da', 'den', 'con', 'muon']);
    expect(shingleHashes('Ngày khai trường đã đến, con muốn', KEY)).toEqual(shingleHashes('ngày khai trường đã đến con muốn.', KEY));
    // A copy typed without accents, or with the old tone placement, is the same copy.
    expect(shingleHashes('Ngay khai truong da den con muon', KEY)).toEqual(shingleHashes('Ngày khai trường đã đến con muốn', KEY));
    expect(shingleHashes('hoà thuận vui vẻ cả nhà cùng cười', KEY)).toEqual(shingleHashes('hòa thuận vui vẻ cả nhà cùng cười', KEY));
  });

  it('hash every 7-word run under the key, and nothing in a shorter text', () => {
    expect(shingleHashes('một hai ba bốn năm sáu', KEY)).toEqual([]);
    expect(shingleHashes('một hai ba bốn năm sáu bảy tám', KEY)).toHaveLength(2);
    // Without the key nobody can test a guessed word against the file.
    expect(shingleHashes('một hai ba bốn năm sáu bảy', Buffer.alloc(32, 8))).not.toEqual(shingleHashes('một hai ba bốn năm sáu bảy', KEY));
  });

  it('read the key from MIU_FINGERPRINT_KEY or the owner iCloud file, and refuse a malformed one', () => {
    expect(fingerprintKey({ MIU_FINGERPRINT_KEY: '07'.repeat(32), MIU_ICLOUD_DIR: '/nowhere' })).toEqual(KEY);
    expect(fingerprintKey({ MIU_ICLOUD_DIR: '/nowhere' })).toBeNull();
    expect(() => fingerprintKey({ MIU_FINGERPRINT_KEY: 'abc' })).toThrow(/64 hex/);
  });

  it('round-trip through the file format, sorted and without duplicates', () => {
    const hashes = [...shingleHashes('một hai ba bốn năm sáu bảy tám chín', KEY), ...shingleHashes('một hai ba bốn năm sáu bảy', KEY)];
    const data = encodeFingerprints(hashes);
    expect(data.length).toBe(3 * 5);
    expect(decodeFingerprints(data)).toEqual(new Set(hashes));
    expect(() => decodeFingerprints(Buffer.alloc(7))).toThrow(/multiple of 5/);
  });

  it('the committed file is the one made from the textbooks before they were removed', () => {
    const data = readFileSync(FINGERPRINTS_FILE);
    expect(createHash('sha256').update(data).digest('hex')).toBe('1523d40a0efdf6caed3972c7a5743cc17d6503ba21a04917f4daa0ef6aedfd27');
    expect(readFingerprints().size).toBe(26588);
  });
});
