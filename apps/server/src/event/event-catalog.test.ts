import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { PlayableQuest } from '@miu/schema/content';
import { LiveEvent } from '@miu/schema/live-event';
import { eventCatalogIssues, readEventFiles } from './event-catalog';

const FIXTURE = new URL('../../test/fixtures/events/events/fixture-fair.json', import.meta.url);
const raw = JSON.parse(readFileSync(FIXTURE, 'utf8')) as Record<string, unknown>;
const fair = LiveEvent.parse(raw);

/** The fields of a quest the event checks read. */
const quest = (id: string, category: string): PlayableQuest => ({ id, status: 'active', category, region: 'khu-rung-bi-mat' }) as unknown as PlayableQuest;
const ctx = {
  items: new Set(['ban-do-sao-dem', 'bang-pha-mau', 'banh-com-xanh', 'banh-donut-ngot']),
  wearables: new Map([
    ['back-thanh-tich-ten-lua', { award: true }],
    ['back-thanh-tich-ngoi-sao', { award: true }],
  ]),
  regions: new Set(['khu-rung-bi-mat']),
};

describe('event files', () => {
  it('reads a folder of events; a missing folder has none', () => {
    expect(readEventFiles(path.dirname(new URL(FIXTURE).pathname)).map((e) => e.id)).toEqual(['fixture-fair']);
    expect(readEventFiles(path.join(tmpdir(), 'miu-no-such-events-folder'))).toEqual([]);
  });

  it('wants each file named after its event', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'miu-events-'));
    writeFileSync(path.join(dir, 'other-name.json'), JSON.stringify(raw));
    expect(() => readEventFiles(dir)).toThrow(/named after its id \(fixture-fair\.json\)/);
  });

  it('accepts an event whose quests and rewards exist', () => {
    expect(eventCatalogIssues([fair], [quest('wonder-fixture-gate', 'event')], ctx)).toEqual([]);
  });

  it('gives each event quest to exactly one event, and each scene character to one event', () => {
    const twin = LiveEvent.parse({ ...raw, id: 'fixture-twin' });
    const issues = eventCatalogIssues([fair, twin], [quest('wonder-fixture-gate', 'event')], ctx);
    expect(issues).toContain('quest wonder-fixture-gate belongs to two events (fixture-fair, fixture-twin)');
    expect(issues).toContain('scene character fixture-fair-fox stands in two events (fixture-fair, fixture-twin)');
    expect(eventCatalogIssues([fair], [quest('wonder-fixture-gate', 'event'), quest('wonder-lost', 'event')], ctx)).toEqual([
      'event quest wonder-lost belongs to no event of content/events',
    ]);
  });

  it('names the event in every problem of its file', () => {
    expect(eventCatalogIssues([fair], [], ctx)).toEqual(['event fixture-fair: quest wonder-fixture-gate is not in content/quests']);
  });
});
