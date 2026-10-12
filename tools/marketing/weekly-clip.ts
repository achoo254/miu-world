// `pnpm marketing:weekly`: the weekly run. It picks this school week's lessons from the schedule, leaves out what the ledger
// says is already posted, films each lesson's clip, writes its caption and posts it on each channel, then writes a short
// report. By default it is a dry run: it films and writes captions but posts nothing and touches no secret; `--publish`
// posts for real. The ledger grows only after a post succeeded, one channel at a time, so a failed channel is tried again
// next run without posting the others twice.
//
//   pnpm marketing:weekly [--publish] [--privacy private|unlisted|public] [--channel youtube|facebook]
//                         [--date yyyy-mm-dd] [--no-render]
//
// `--privacy` defaults to private (the first real post is checked by the owner before the timer posts in public).
// `--no-render` skips filming (dry run only), for checking the picks and captions quickly.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readLessonPageData, type LessonPageData } from '../../apps/web/lesson-page-data';
import { REPO_ROOT } from '../assets/asset-lib';
import { captionFor } from './captions';
import { CHANNELS, type Channel } from './channels';
import { CLIP_DIR } from './clip-encode';
import type { RenderedClip } from './render-lesson-clip';
import { ClipSchedule, dateInSchool, readClipSchedule, weekOf } from './clip-schedule';
import { DEFAULT_PRIVACY, PRIVACY, type PostEnvironment, type PostOutcome, type PostRequest, type Privacy } from './post-common';
import { postFacebook } from './post-facebook';
import { postYoutube } from './post-youtube';
import { LEDGER_PATH, appendPost, hasPosted, readLedger, recentTemplateIds, type PostedLedger } from './posted-ledger';

export const REPORTS_DIR = path.join(REPO_ROOT, 'plans/dattqh/reports');

export interface WeeklyOptions {
  publish: boolean;
  privacy: Privacy;
  channels: readonly Channel[];
  /** The day to run for (yyyy-mm-dd, Vietnam time); today when absent. */
  date?: string;
  /** Film the clips; false only describes the picks and captions (a dry run). */
  render: boolean;
}

export type Poster = (request: PostRequest, env: PostEnvironment) => Promise<PostOutcome>;

/** What the run uses from outside; the defaults are the real ones, tests give their own. */
export interface WeeklyDeps {
  now: () => Date;
  schedule: ClipSchedule;
  lessons: readonly LessonPageData[];
  ledgerFile: string;
  reportsDir: string;
  render: (lesson: LessonPageData) => Promise<RenderedClip>;
  post: Record<Channel, Poster>;
  /** Where a clip is expected when it is not filmed. */
  clipPathOf: (lesson: LessonPageData) => string;
}

export type RowStatus = 'dry-run' | 'posted' | 'already-posted' | 'failed';

export interface Row {
  lessonId: string;
  title: string;
  channel: Channel;
  status: RowStatus;
  /** The post's link, what would be sent or the reason it failed. */
  detail: string;
  /** The caption title used. */
  caption?: string;
  templateId?: string;
}

export interface WeeklyResult {
  /** The school week run for, or null when the date is outside the semester. */
  week: number | null;
  date: string;
  rows: Row[];
  reportFile: string;
  failed: boolean;
}

const yymmdd = (isoDate: string): string => isoDate.replaceAll('-', '').slice(2);

const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error));

const STATUS_TEXT: Record<RowStatus, string> = {
  'dry-run': 'chạy khô (chưa đăng)',
  posted: 'đã đăng',
  'already-posted': 'bỏ qua, đã đăng trước đó',
  failed: 'lỗi',
};

/** The report in Vietnamese. Holds links and the services' error messages (which hold no secret), never a token. */
export function reportMarkdown(result: Pick<WeeklyResult, 'week' | 'date' | 'rows'>, options: Pick<WeeklyOptions, 'publish' | 'privacy'>): string {
  const lines = [
    `# Đăng clip hằng tuần ${result.date}`,
    '',
    `- Chế độ: ${options.publish ? `đăng thật (quyền xem: ${options.privacy})` : 'chạy khô, không đăng gì và không đọc token'}`,
    `- Tuần học: ${result.week ?? 'ngoài học kì I, không có bài nào trong lịch'}`,
    `- Số liệu Google Analytics của tuần trước: chưa có trong báo cáo này (xem trực tiếp trong GA4, nguồn \`youtube\` và \`facebook\`, chiến dịch \`weekly-clip\`).`,
    '',
  ];
  if (result.rows.length === 0) return `${lines.join('\n')}Không có clip nào để làm tuần này.\n`;
  lines.push('| Bài | Kênh | Kết quả | Tiêu đề | Chi tiết |', '| --- | --- | --- | --- | --- |');
  for (const row of result.rows) {
    const cell = (text: string): string => text.replaceAll('|', '\\|').replaceAll('\n', ' ');
    lines.push(`| ${cell(row.title)} (\`${row.lessonId}\`) | ${row.channel} | ${STATUS_TEXT[row.status]} | ${cell(row.caption ?? '')} | ${cell(row.detail)} |`);
  }
  const failed = result.rows.filter((r) => r.status === 'failed');
  lines.push('', failed.length > 0 ? `Có ${failed.length} lỗi; lần chạy sau sẽ thử lại phần chưa đăng (sổ \`content/marketing/posted.json\` chỉ ghi bài đã đăng được).` : 'Không có lỗi.');
  return `${lines.join('\n')}\n`;
}

export async function runWeekly(options: WeeklyOptions, deps: WeeklyDeps): Promise<WeeklyResult> {
  if (options.publish && !options.render) throw new Error('--no-render cannot be combined with --publish: a post needs a filmed clip');
  const date = options.date ?? dateInSchool(deps.now());
  const entry = weekOf(deps.schedule, date);
  const rows: Row[] = [];
  const reportFile = path.join(deps.reportsDir, `marketing-weekly-${yymmdd(date)}.md`);
  const finish = (week: number | null): WeeklyResult => {
    const result: WeeklyResult = { week, date, rows, reportFile, failed: rows.some((r) => r.status === 'failed') };
    mkdirSync(deps.reportsDir, { recursive: true });
    writeFileSync(reportFile, reportMarkdown(result, options));
    return result;
  };
  if (!entry) return finish(null);
  let ledger: PostedLedger = readLedger(deps.ledgerFile);
  // Templates of the latest posts per channel, newest first, plus the ones this run uses (a dry run writes no ledger).
  const recent = new Map<Channel, string[]>(CHANNELS.map((c) => [c, recentTemplateIds(ledger, c)]));

  for (const lessonId of Object.values(entry.lessons)) {
    const lesson = deps.lessons.find((l) => l.lessonId === lessonId);
    if (!lesson) throw new Error(`the schedule names lesson ${lessonId}, which has no lesson page`);
    const pending = options.channels.filter((channel) => {
      const done = hasPosted(ledger, lessonId, channel);
      if (done) rows.push({ lessonId, title: lesson.title, channel, status: 'already-posted', detail: 'có trong sổ đã đăng' });
      return !done;
    });
    if (pending.length === 0) continue;

    let clipFile: string;
    try {
      clipFile = options.render ? (await deps.render(lesson)).file : deps.clipPathOf(lesson);
    } catch (error) {
      for (const channel of pending) rows.push({ lessonId, title: lesson.title, channel, status: 'failed', detail: `không quay được clip: ${errorText(error)}` });
      continue;
    }

    for (const channel of pending) {
      const caption = captionFor(lesson, channel, recent.get(channel) ?? []);
      recent.set(channel, [caption.templateId, ...(recent.get(channel) ?? [])]);
      const base = { lessonId, title: lesson.title, channel, caption: caption.title, templateId: caption.templateId };
      try {
        const outcome = await deps.post[channel]({ clipFile, title: caption.title, description: caption.description, privacy: options.privacy }, { publish: options.publish });
        if (outcome.status === 'dry-run') {
          rows.push({ ...base, status: 'dry-run', detail: outcome.summary });
          continue;
        }
        ledger = appendPost({ lessonId, channel, week: entry.week, postedAt: deps.now().toISOString(), templateId: caption.templateId, privacy: options.privacy, url: outcome.url }, deps.ledgerFile);
        rows.push({ ...base, status: 'posted', detail: outcome.url });
      } catch (error) {
        rows.push({ ...base, status: 'failed', detail: errorText(error) });
      }
    }
  }

  return finish(entry.week);
}

/** The command line as options; anything it does not know is an error rather than ignored. */
export function parseArgs(argv: readonly string[]): WeeklyOptions {
  const args = argv.filter((a) => a !== '--');
  const options: WeeklyOptions = { publish: false, privacy: DEFAULT_PRIVACY, channels: CHANNELS, render: true };
  const channels: Channel[] = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = (): string => {
      const next = args[++i];
      if (next === undefined) throw new Error(`${arg} needs a value`);
      return next;
    };
    if (arg === '--publish') options.publish = true;
    else if (arg === '--no-render') options.render = false;
    else if (arg === '--privacy') {
      const privacy = value();
      if (!(PRIVACY as readonly string[]).includes(privacy)) throw new Error(`--privacy is one of ${PRIVACY.join(', ')}`);
      options.privacy = privacy as Privacy;
    } else if (arg === '--channel') {
      const channel = value();
      if (!(CHANNELS as readonly string[]).includes(channel)) throw new Error(`--channel is one of ${CHANNELS.join(', ')}`);
      channels.push(channel as Channel);
    } else if (arg === '--date') {
      const date = value();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('--date is yyyy-mm-dd');
      options.date = date;
    } else throw new Error(`unknown option ${String(arg)}`);
  }
  return { ...options, channels: channels.length > 0 ? channels : CHANNELS };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const result = await runWeekly(options, {
    now: () => new Date(),
    schedule: readClipSchedule(),
    lessons: readLessonPageData(path.join(REPO_ROOT, 'content')),
    ledgerFile: LEDGER_PATH,
    reportsDir: REPORTS_DIR,
    // A clip already filmed (and not posted yet) is used again; delete it to film it anew.
    render: async (lesson) => {
      const file = path.join(CLIP_DIR, `${lesson.slug}.mp4`);
      if (existsSync(file)) return { file, lessonId: lesson.lessonId, slug: lesson.slug, track: '' };
      // Loaded only now: filming pulls in the browser and the dev server, which a run that films nothing does not need.
      return (await import('./render-lesson-clip')).renderLessonClip(lesson);
    },
    post: { youtube: postYoutube, facebook: postFacebook },
    clipPathOf: (lesson) => path.join(CLIP_DIR, `${lesson.slug}.mp4`),
  });
  for (const row of result.rows) console.log(`${row.status}: ${row.lessonId} on ${row.channel}: ${row.detail}`);
  console.log(`report: ${path.relative(REPO_ROOT, result.reportFile)}${options.publish ? '' : ' (dry run: nothing was posted)'}`);
  if (result.failed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
