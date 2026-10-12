// `content:check` for `content/marketing/`: the channel kit parses, the clip schedule is sound and names only lessons that
// have a public page (and each in its own subject), and the posted ledger parses and lists only scheduled lessons.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { readLessonPageData } from '../../apps/web/lesson-page-data';
import { ChannelKit } from './channels';
import { ClipSchedule, scheduleIssues } from './clip-schedule';
import { PostedLedger } from './posted-ledger';

const read = (contentDir: string, file: string): unknown => JSON.parse(readFileSync(path.join(contentDir, 'marketing', file), 'utf8'));

export function marketingIssues(contentDir: string): string[] {
  const issues: string[] = [];
  const kit = ChannelKit.safeParse(read(contentDir, 'channels.json'));
  if (!kit.success) issues.push(`content/marketing/channels.json: ${kit.error.message}`);

  const schedule = ClipSchedule.safeParse(read(contentDir, 'clip-schedule.json'));
  if (!schedule.success) issues.push(`content/marketing/clip-schedule.json: ${schedule.error.message}`);
  const ledger = PostedLedger.safeParse(read(contentDir, 'posted.json'));
  if (!ledger.success) issues.push(`content/marketing/posted.json: ${ledger.error.message}`);
  if (!schedule.success) return issues;

  issues.push(...scheduleIssues(schedule.data).map((issue) => `content/marketing/clip-schedule.json: ${issue}`));
  const subjectOf = new Map(readLessonPageData(contentDir).map((page) => [page.lessonId, page.subject.slug]));
  const scheduled = new Set<string>();
  for (const week of schedule.data.weeks) {
    for (const [subject, lessonId] of Object.entries(week.lessons)) {
      scheduled.add(lessonId);
      if (subjectOf.get(lessonId) !== subject) issues.push(`content/marketing/clip-schedule.json: week ${week.week}: ${lessonId} is not a ${subject} lesson with a lesson page`);
    }
  }
  if (ledger.success) {
    for (const post of ledger.data.posts) {
      if (!scheduled.has(post.lessonId)) issues.push(`content/marketing/posted.json: ${post.lessonId} is not in the clip schedule`);
    }
  }
  return issues;
}
