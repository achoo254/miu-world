import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CONTENT_DIR } from '../../apps/server/src/content/content-catalog';
import { checkContent } from './check-content';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'miu-content-'));
  cpSync(CONTENT_DIR, dir, { recursive: true });
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('content:check', () => {
  it('passes the shipped content and says which checks are not run yet', () => {
    const report = checkContent();
    expect(report.issues).toEqual([]);
    expect(report.notes.join(' ')).toMatch(/map targets/);
  });

  it('flags a JSON file nothing validates', () => {
    writeFileSync(path.join(dir, 'learning/extra.json'), '{}');
    writeFileSync(path.join(dir, 'quests/forest-ch3.JSON'), '{}');
    expect(checkContent(dir).issues).toEqual([
      'content/learning/extra.json has no validator: add it to the server catalogue or an asset tool',
      'content/quests/forest-ch3.JSON has no validator: add it to the server catalogue or an asset tool',
    ]);
  });

  it('flags a quest that breaks the schema or points at unknown content', () => {
    writeFileSync(path.join(dir, 'quests/forest-ch2.json'), JSON.stringify({ id: 'forest-ch2', region: 'r', chapter: 2, status: 'stub' }));
    expect(checkContent(dir).issues.join('\n')).toMatch(/invalid content file forest-ch2\.json/);
    const ch1 = path.join(dir, 'quests/forest-ch1.json');
    writeFileSync(ch1, JSON.stringify({ ...(JSON.parse(readFileSync(ch1, 'utf8')) as object), unlock: ['forest-ch9'] }));
    writeFileSync(path.join(dir, 'quests/forest-ch2.json'), JSON.stringify({ id: 'forest-ch2', region: 'r', chapter: 2, title: 't', status: 'stub' }));
    expect(checkContent(dir).issues.join('\n')).toMatch(/quest forest-ch1 unlocks unknown quest forest-ch9/);
  });
});
