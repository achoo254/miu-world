import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { readLessonPageData } from '../../apps/web/lesson-page-data';
import { REPO_ROOT } from '../assets/asset-lib';
import { readClipSchedule } from './clip-schedule';
import type { PostOutcome, PostRequest } from './post-common';
import { readLedger } from './posted-ledger';
import { parseArgs, reportMarkdown, runWeekly, type Poster, type WeeklyDeps, type WeeklyOptions } from './weekly-clip';

const lessons = readLessonPageData(path.join(REPO_ROOT, 'content'));
const schedule = readClipSchedule();
/** Week 6 of the schedule: 12/10/2026. */
const MONDAY = '2026-10-12';

const dryOptions: WeeklyOptions = { publish: false, privacy: 'private', channels: ['youtube', 'facebook'], date: MONDAY, render: true };
const publishOptions: WeeklyOptions = { ...dryOptions, publish: true };

function setup(posters: Partial<Record<'youtube' | 'facebook', Poster>> = {}): { deps: WeeklyDeps; render: ReturnType<typeof vi.fn>; youtube: ReturnType<typeof vi.fn>; facebook: ReturnType<typeof vi.fn>; dir: string } {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'miu-weekly-'));
  const ledgerFile = path.join(dir, 'posted.json');
  writeFileSync(ledgerFile, JSON.stringify({ version: 1, posts: [] }));
  const succeed = (channel: string): Poster => async (request: PostRequest, env) =>
    env.publish ? { status: 'posted', id: `${channel}-${request.title.length}`, url: `https://example.com/${channel}/${encodeURIComponent(path.basename(request.clipFile))}` } : { status: 'dry-run', summary: `${channel}: would post ${request.title}` };
  const render = vi.fn(async (lesson: { slug: string; lessonId: string }) => ({ file: path.join(dir, `${lesson.slug}.mp4`), lessonId: lesson.lessonId, slug: lesson.slug, track: 'x' }));
  const youtube = vi.fn(posters.youtube ?? succeed('youtube'));
  const facebook = vi.fn(posters.facebook ?? succeed('facebook'));
  const deps: WeeklyDeps = {
    now: () => new Date('2026-10-12T02:00:00Z'),
    schedule,
    lessons,
    ledgerFile,
    reportsDir: path.join(dir, 'reports'),
    render: render as unknown as WeeklyDeps['render'],
    post: { youtube: youtube as unknown as Poster, facebook: facebook as unknown as Poster },
    clipPathOf: (lesson) => path.join(dir, `${lesson.slug}.mp4`),
  };
  return { deps, render, youtube, facebook, dir };
}

describe('the weekly run', () => {
  it('picks the lessons of the week, films and captions them, and in a dry run posts nothing and writes no ledger', async () => {
    const { deps, render, youtube, facebook } = setup();
    const result = await runWeekly(dryOptions, deps);
    expect(result.week).toBe(6);
    expect(render).toHaveBeenCalledTimes(2);
    expect(result.rows).toHaveLength(4);
    expect(result.rows.every((r) => r.status === 'dry-run')).toBe(true);
    for (const call of [...youtube.mock.calls, ...facebook.mock.calls]) expect((call[1] as { publish: boolean }).publish).toBe(false);
    expect(readLedger(deps.ledgerFile).posts).toEqual([]);
    expect(result.failed).toBe(false);
    expect(result.reportFile).toBe(path.join(deps.reportsDir, 'marketing-weekly-261012.md'));
    const report = readFileSync(result.reportFile, 'utf8');
    expect(report).toContain('chạy khô');
    expect(report).toContain('Tuần học: 6');
  });

  it('asks for the lessons the schedule names for that week, one per subject', async () => {
    const { deps, render } = setup();
    await runWeekly(dryOptions, deps);
    const wanted = Object.values(schedule.weeks[5]?.lessons ?? {});
    expect(render.mock.calls.map((c) => (c[0] as { lessonId: string }).lessonId)).toEqual(wanted);
  });

  it('posts for real with --publish, appends each success to the ledger and never posts it again', async () => {
    const { deps, render, youtube, facebook } = setup();
    const first = await runWeekly(publishOptions, deps);
    expect(first.rows.map((r) => r.status)).toEqual(['posted', 'posted', 'posted', 'posted']);
    const ledger = readLedger(deps.ledgerFile);
    expect(ledger.posts).toHaveLength(4);
    expect(ledger.posts.every((p) => p.week === 6 && p.privacy === 'private')).toBe(true);

    render.mockClear();
    youtube.mockClear();
    facebook.mockClear();
    const second = await runWeekly(publishOptions, deps);
    expect(second.rows.map((r) => r.status)).toEqual(['already-posted', 'already-posted', 'already-posted', 'already-posted']);
    expect(render).not.toHaveBeenCalled();
    expect(youtube).not.toHaveBeenCalled();
    expect(facebook).not.toHaveBeenCalled();
    expect(readLedger(deps.ledgerFile).posts).toHaveLength(4);
  });

  it('keeps a failure to one channel: the other posts, only it reaches the ledger, and the next run tries the failed one alone', async () => {
    const failing: Poster = async (): Promise<PostOutcome> => {
      throw new Error('HTTP 403 quota exceeded');
    };
    const { deps, youtube, facebook } = setup({ youtube: failing });
    const first = await runWeekly(publishOptions, deps);
    expect(first.failed).toBe(true);
    expect(first.rows.filter((r) => r.status === 'failed').map((r) => r.channel)).toEqual(['youtube', 'youtube']);
    expect(readLedger(deps.ledgerFile).posts.map((p) => p.channel)).toEqual(['facebook', 'facebook']);
    expect(readFileSync(first.reportFile, 'utf8')).toContain('HTTP 403 quota exceeded');

    youtube.mockClear();
    facebook.mockClear();
    const healed = setup().deps;
    const second = await runWeekly(publishOptions, { ...deps, post: { youtube: healed.post.youtube, facebook: facebook as unknown as Poster } });
    expect(facebook).not.toHaveBeenCalled();
    expect(second.rows.filter((r) => r.status === 'posted').map((r) => r.channel)).toEqual(['youtube', 'youtube']);
    expect(readLedger(deps.ledgerFile).posts).toHaveLength(4);
  });

  it('reports a clip that could not be filmed and goes on with the next lesson', async () => {
    const { deps } = setup();
    let calls = 0;
    const flaky = vi.fn(async (lesson: { slug: string; lessonId: string }) => {
      if (calls++ === 0) throw new Error('ffmpeg is not installed');
      return { file: `/tmp/${lesson.slug}.mp4`, lessonId: lesson.lessonId, slug: lesson.slug, track: 'x' };
    });
    const result = await runWeekly(dryOptions, { ...deps, render: flaky as unknown as WeeklyDeps['render'] });
    expect(result.rows.filter((r) => r.status === 'failed')).toHaveLength(2);
    expect(result.rows.filter((r) => r.status === 'dry-run')).toHaveLength(2);
    expect(result.failed).toBe(true);
  });

  it('gives two clips on the same channel in one run different caption templates', async () => {
    const { deps } = setup();
    const result = await runWeekly(dryOptions, deps);
    const youtubeTemplates = result.rows.filter((r) => r.channel === 'youtube').map((r) => r.templateId);
    expect(new Set(youtubeTemplates).size).toBe(youtubeTemplates.length);
  });

  it('runs for one channel only when told to', async () => {
    const { deps, youtube, facebook } = setup();
    const result = await runWeekly({ ...dryOptions, channels: ['facebook'] }, deps);
    expect(result.rows.map((r) => r.channel)).toEqual(['facebook', 'facebook']);
    expect(youtube).not.toHaveBeenCalled();
    expect(facebook).toHaveBeenCalledTimes(2);
  });

  it('does nothing outside the semester but still writes a report', async () => {
    const { deps, render } = setup();
    const result = await runWeekly({ ...dryOptions, date: '2027-02-01' }, deps);
    expect(result.week).toBeNull();
    expect(result.rows).toEqual([]);
    expect(render).not.toHaveBeenCalled();
    expect(readFileSync(result.reportFile, 'utf8')).toContain('ngoài học kì I');
  });

  it('takes the date from the clock in Vietnam when none is given', async () => {
    const { deps } = setup();
    // 17:30 UTC on Sunday 11/10 is already Monday 12/10 in Vietnam.
    const result = await runWeekly({ ...dryOptions, date: undefined }, { ...deps, now: () => new Date('2026-10-11T17:30:00Z') });
    expect(result.date).toBe(MONDAY);
    expect(result.week).toBe(6);
  });

  it('will not post without filming', async () => {
    await expect(runWeekly({ ...publishOptions, render: false }, setup().deps)).rejects.toThrow(/--no-render/);
  });

  it('stops when the schedule names a lesson that has no page', async () => {
    const { deps } = setup();
    await expect(runWeekly(dryOptions, { ...deps, lessons: [] })).rejects.toThrow(/has no lesson page/);
  });
});

describe('the report', () => {
  it('lists each post with its result and holds nothing but what the rows hold', () => {
    const text = reportMarkdown(
      { week: 6, date: MONDAY, rows: [{ lessonId: 'toan2-t1-b11', title: 'Bài 11. Phép trừ | qua 10', channel: 'youtube', status: 'posted', detail: 'https://www.youtube.com/shorts/abc', caption: 'Tiêu đề' }] },
      { publish: true, privacy: 'private' },
    );
    expect(text).toContain('đăng thật (quyền xem: private)');
    expect(text).toContain('https://www.youtube.com/shorts/abc');
    expect(text).toContain('Phép trừ \\| qua 10');
    expect(text).toContain('Không có lỗi');
  });
});

describe('the command line', () => {
  it('is a dry run, private, on both channels, with filming, unless told otherwise', () => {
    expect(parseArgs(['--'])).toEqual({ publish: false, privacy: 'private', channels: ['youtube', 'facebook'], render: true });
  });

  it('reads every option', () => {
    expect(parseArgs(['--', '--publish', '--privacy', 'public', '--channel', 'youtube', '--date', '2026-10-12', '--no-render'])).toEqual({
      publish: true,
      privacy: 'public',
      channels: ['youtube'],
      date: '2026-10-12',
      render: false,
    });
  });

  it('refuses what it does not know', () => {
    expect(() => parseArgs(['--post'])).toThrow(/unknown option/);
    expect(() => parseArgs(['--privacy', 'secret'])).toThrow(/--privacy is one of/);
    expect(() => parseArgs(['--channel', 'tiktok'])).toThrow(/--channel is one of/);
    expect(() => parseArgs(['--date', 'today'])).toThrow(/--date is yyyy-mm-dd/);
    expect(() => parseArgs(['--privacy'])).toThrow(/needs a value/);
  });
});
