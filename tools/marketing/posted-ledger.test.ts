import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEDGER_PATH, appendPost, hasPosted, readLedger, recentTemplateIds, type PostedEntry } from './posted-ledger';

const entry = (over: Partial<PostedEntry> = {}): PostedEntry => ({
  lessonId: 'toan2-t1-b07',
  channel: 'youtube',
  week: 4,
  postedAt: '2026-10-05T02:00:00.000Z',
  templateId: 'adventure',
  privacy: 'private',
  url: 'https://www.youtube.com/shorts/abc123',
  ...over,
});

function ledgerFile(posts: PostedEntry[] = []): string {
  const file = path.join(mkdtempSync(path.join(os.tmpdir(), 'miu-ledger-')), 'posted.json');
  writeFileSync(file, JSON.stringify({ version: 1, posts }));
  return file;
}

describe('the committed ledger', () => {
  it('is valid', () => {
    expect(() => readLedger(LEDGER_PATH)).not.toThrow();
  });
});

describe('the posted ledger', () => {
  it('tells whether a lesson went out on a channel, each channel on its own', () => {
    const ledger = readLedger(ledgerFile([entry()]));
    expect(hasPosted(ledger, 'toan2-t1-b07', 'youtube')).toBe(true);
    expect(hasPosted(ledger, 'toan2-t1-b07', 'facebook')).toBe(false);
    expect(hasPosted(ledger, 'toan2-t1-b08', 'youtube')).toBe(false);
  });

  it('lists a channel\'s caption templates newest first', () => {
    const ledger = readLedger(ledgerFile([entry({ templateId: 'a' }), entry({ lessonId: 'x', channel: 'facebook', templateId: 'f' }), entry({ lessonId: 'y', templateId: 'b' })]));
    expect(recentTemplateIds(ledger, 'youtube')).toEqual(['b', 'a']);
    expect(recentTemplateIds(ledger, 'facebook')).toEqual(['f']);
  });

  it('appends a post and keeps the earlier ones', () => {
    const file = ledgerFile([entry()]);
    const next = appendPost(entry({ lessonId: 'toan2-t1-b09' }), file);
    expect(next.posts.map((p) => p.lessonId)).toEqual(['toan2-t1-b07', 'toan2-t1-b09']);
    expect(readLedger(file)).toEqual(next);
    expect(readFileSync(file, 'utf8').endsWith('\n')).toBe(true);
  });

  it('refuses a second post of the same lesson on the same channel', () => {
    const file = ledgerFile([entry()]);
    expect(() => appendPost(entry({ postedAt: '2026-10-06T02:00:00.000Z' }), file)).toThrow(/already in the ledger/);
    expect(readLedger(file).posts).toHaveLength(1);
  });

  it('refuses a malformed post and a ledger that lists one twice', () => {
    expect(() => appendPost(entry({ url: 'not a url' }), ledgerFile())).toThrow();
    expect(() => readLedger(ledgerFile([entry(), entry()]))).toThrow(/posted twice/);
    expect(() => readLedger(ledgerFile([{ ...entry(), extra: 1 } as PostedEntry]))).toThrow();
  });
});
