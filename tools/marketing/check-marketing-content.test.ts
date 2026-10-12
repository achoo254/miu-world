import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../assets/asset-lib';
import { marketingIssues } from './check-marketing-content';

const CONTENT = path.join(REPO_ROOT, 'content');

/** A copy of the content folder's parts the check reads, with `edit` applied to one marketing file. */
function contentWith(file: string, edit: (json: Record<string, unknown>) => void): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'miu-marketing-'));
  for (const part of ['marketing', 'curriculum', 'quests', 'world/regions.json']) cpSync(path.join(CONTENT, part), path.join(dir, part), { recursive: true });
  const target = path.join(dir, 'marketing', file);
  const json = JSON.parse(readFileSync(target, 'utf8')) as Record<string, unknown>;
  edit(json);
  writeFileSync(target, JSON.stringify(json));
  return dir;
}

describe('the marketing content check', () => {
  it('passes the committed files', () => {
    expect(marketingIssues(CONTENT)).toEqual([]);
  });

  it('reports a lesson in the wrong subject or with no page', () => {
    const dir = contentWith('clip-schedule.json', (json) => {
      const weeks = json.weeks as Array<{ lessons: Record<string, string> }>;
      const first = weeks[0];
      if (first) first.lessons['toan-2'] = 'tv2-t1-b01';
      const second = weeks[1];
      if (second) second.lessons['tieng-viet-2'] = 'tv2-t1-b99';
    });
    const issues = marketingIssues(dir).join('\n');
    expect(issues).toContain('week 1: tv2-t1-b01 is not a toan-2 lesson');
    expect(issues).toContain('week 2: tv2-t1-b99 is not a tieng-viet-2 lesson');
  });

  it('reports a ledger entry for a lesson the schedule does not name, and a broken channel kit', () => {
    const ledger = contentWith('posted.json', (json) => {
      json.posts = [{ lessonId: 'toan2-t1-b01', channel: 'youtube', week: 1, postedAt: '2026-09-07T02:00:00.000Z', templateId: 'x', privacy: 'public', url: 'https://www.youtube.com/shorts/a' }];
    });
    expect(marketingIssues(ledger).join('\n')).toContain('toan2-t1-b01 is not in the clip schedule');
    const kit = contentWith('channels.json', (json) => {
      json.version = 2;
    });
    expect(marketingIssues(kit).join('\n')).toContain('channels.json');
  });
});
