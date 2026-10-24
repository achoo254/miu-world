// `pnpm content:gaps --topics [--missing]`: which objectives of each topic (content/learning/topics) the quests
// practise, and which exercise kinds are still missing; topics marked "gate" must be complete.
// `pnpm content:gaps [--book toan2-t1|tv2-t1] [--unit <unit id>] [--missing] [--review]`: which textbook
// exercises the quests still waiting to be rewritten cover, in the game or on a printed worksheet, per lesson, unit
// and book. `--review` also writes the totals for the review page (assets/generated/review/sgk-coverage.json).
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { CONTENT_DIR, readQuestDefinitions } from '../../apps/server/src/content/content-catalog';
import { ASSETS_DIR } from '../assets/asset-lib';
import { checkCurriculum } from './check-curriculum';
import { checkCurriculumLinks, type LessonGaps } from './curriculum-links';
import { checkLearningLinks, type ObjectiveCoverage } from './learning-links';
import { readPendingQuests } from './no-textbook-copy';
import { readTopicFiles } from '../../apps/server/src/content/learning-topics';

export interface GapTotals {
  items: number;
  inGame: number;
  onWorksheet: number;
  missing: number;
  missingTexts: number;
}

export function sumGaps(lessons: readonly LessonGaps[]): GapTotals {
  return lessons.reduce(
    (t, l) => ({
      items: t.items + l.items,
      inGame: t.inGame + l.inGame,
      onWorksheet: t.onWorksheet + l.onWorksheet,
      missing: t.missing + l.missing.length,
      missingTexts: t.missingTexts + l.missingTexts.length,
    }),
    { items: 0, inGame: 0, onWorksheet: 0, missing: 0, missingTexts: 0 },
  );
}

/** Share of items covered (game or worksheet), one decimal; only a complete lesson shows 100. */
export function percentCovered(t: GapTotals): number {
  if (t.items === 0) return 100;
  const percent = Math.round(((t.inGame + t.onWorksheet) / t.items) * 1000) / 10;
  return t.missing > 0 ? Math.min(percent, 99.9) : percent;
}

const row = (name: string, t: GapTotals) =>
  `${name.padEnd(26)} ${String(t.items).padStart(5)} ${String(t.inGame).padStart(6)} ${String(t.onWorksheet).padStart(7)} ${String(t.missing).padStart(6)} ${`${percentCovered(t)}%`.padStart(7)}${t.missingTexts > 0 ? `  (${t.missingTexts} passage(s) not shown)` : ''}`;

export function gapTable(lessons: readonly LessonGaps[], showMissing: boolean): string[] {
  const lines = [`${'lesson / unit / book'.padEnd(26)} ${'items'.padStart(5)} ${'game'.padStart(6)} ${'phiếu'.padStart(7)} ${'thiếu'.padStart(6)} ${'phủ'.padStart(7)}`];
  for (const book of [...new Set(lessons.map((l) => l.book))]) {
    const inBook = lessons.filter((l) => l.book === book);
    for (const unit of [...new Set(inBook.map((l) => l.unit))]) {
      const inUnit = inBook.filter((l) => l.unit === unit);
      for (const lesson of inUnit) {
        lines.push(row(`  ${lesson.lesson}`, sumGaps([lesson])));
        if (showMissing) for (const id of [...lesson.missing, ...lesson.missingTexts]) lines.push(`      - ${id}`);
      }
      lines.push(row(` ${unit}`, sumGaps(inUnit)));
    }
    lines.push(row(book, sumGaps(inBook)));
  }
  return lines;
}

export const COVERAGE_FILE = path.join(ASSETS_DIR, 'generated/review/sgk-coverage.json');

/** Totals per book and unit (with their titles from the inventory), as the review page shows them. */
export function coverageSummary(
  lessons: readonly LessonGaps[],
  titles: ReadonlyMap<string, string> = new Map(),
): { books: Array<{ book: string; title: string; totals: GapTotals; percent: number; units: Array<{ unit: string; title: string; totals: GapTotals; percent: number; lessons: number }> }> } {
  return {
    books: [...new Set(lessons.map((l) => l.book))].map((book) => {
      const inBook = lessons.filter((l) => l.book === book);
      const totals = sumGaps(inBook);
      return {
        book,
        title: titles.get(book) ?? book,
        totals,
        percent: percentCovered(totals),
        units: [...new Set(inBook.map((l) => l.unit))].map((unit) => {
          const inUnit = inBook.filter((l) => l.unit === unit);
          const t = sumGaps(inUnit);
          return { unit, title: titles.get(unit) ?? unit, totals: t, percent: percentCovered(t), lessons: inUnit.length };
        }),
      };
    }),
  };
}

/** One line per objective: steps that practise it, kinds still missing, and whether the gate holds it. */
export function objectiveTable(coverage: readonly ObjectiveCoverage[], showMissing: boolean): string[] {
  const lines = [`${'topic / objective'.padEnd(48)} ${'steps'.padStart(5)} ${'phủ'.padStart(5)}  gate`];
  for (const topic of [...new Set(coverage.map((c) => c.topic))]) {
    const rows = coverage.filter((c) => c.topic === topic);
    const done = rows.filter((c) => c.missing.length === 0).length;
    lines.push(`${topic.padEnd(48)} ${''.padStart(5)} ${`${done}/${rows.length}`.padStart(5)}  ${rows[0]?.gated ? 'gate' : 'waiting'}`);
    for (const row of rows) {
      if (!showMissing && row.missing.length === 0) continue;
      lines.push(`  ${row.objective.padEnd(46)} ${String(row.steps).padStart(5)} ${(row.missing.length === 0 ? 'ok' : 'thiếu').padStart(5)}${row.missing.length > 0 ? `  ${row.missing.join(', ')}` : ''}`);
    }
  }
  return lines;
}

function main(): void {
  const { values } = parseArgs({ options: { book: { type: 'string' }, unit: { type: 'string' }, missing: { type: 'boolean' }, review: { type: 'boolean' }, topics: { type: 'boolean' } } });
  if (values.topics) {
    const quests = readQuestDefinitions(path.join(CONTENT_DIR, 'quests'));
    const { topics, issues } = readTopicFiles(path.join(CONTENT_DIR, 'learning/topics'));
    const report = checkLearningLinks(topics, quests, readPendingQuests());
    for (const line of objectiveTable(report.coverage, values.missing ?? false)) console.log(line);
    const problems = [...issues, ...report.issues];
    if (problems.length > 0) {
      console.error(`
${problems.length} problem(s) to fix first:`);
      for (const p of problems) console.error(`  - ${p}`);
      process.exit(1);
    }
    return;
  }
  const curriculum = checkCurriculum();
  const quests = readQuestDefinitions(path.join(CONTENT_DIR, 'quests'));
  const report = checkCurriculumLinks(curriculum.books, quests);
  const lessons = report.lessons.filter((l) => (!values.book || l.book === values.book) && (!values.unit || l.unit === values.unit));
  for (const line of gapTable(lessons, values.missing ?? false)) console.log(line);
  if (values.review) {
    const titles = new Map(curriculum.books.flatMap((b) => [[b.book.id, b.book.title] as const, ...b.book.toc.map((u) => [u.id, u.title] as const)]));
    writeFileSync(COVERAGE_FILE, `${JSON.stringify(coverageSummary(report.lessons, titles), null, 2)}\n`);
    console.log(`\nreview totals written to ${path.relative(process.cwd(), COVERAGE_FILE)} (run pnpm assets:manifest)`);
  }
  const problems = [...curriculum.issues, ...report.issues];
  if (problems.length > 0) {
    console.error(`\n${problems.length} problem(s) to fix first:`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
