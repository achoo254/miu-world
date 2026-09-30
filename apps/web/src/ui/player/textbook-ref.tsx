// Where a textbook quest sits in the printed book. Teachers set homework by page ("trang 25") or by
// lesson title, so every place that names such a quest also names its book, lesson and pages.
import type { QuestSummary, QuestTextbook } from '@miu/schema/game';
import { Icon } from '../kit/art';
import './player.css';

export function pageText([from, to]: QuestTextbook['pages']): string {
  return from === to ? `Trang ${from}` : `Trang ${from}–${to}`;
}

/** The textbook lesson of a quest, or null for quests outside the textbook (and "coming soon" stubs). */
export function textbookOf(summary: QuestSummary): QuestTextbook | null {
  return summary.quest.status === 'active' ? (summary.quest.textbook ?? null) : null;
}

/** "📚 Tiếng Việt 2, tập một · Bài 1. Tôi là học sinh lớp 2 · Trang 10–12"; `compact` drops the book name. */
export function TextbookRef({ textbook, dataId, compact = false }: { textbook: QuestTextbook; dataId: string; compact?: boolean }) {
  return (
    <span className={`textbook-ref${compact ? ' textbook-ref--compact' : ''}`} data-id={dataId}>
      <Icon name="books" size={compact ? 20 : 24} />
      <span className="textbook-ref-lesson">{compact ? textbook.lesson : `${textbook.book} · ${textbook.lesson}`}</span>
      <strong className="textbook-ref-pages">{pageText(textbook.pages)}</strong>
    </span>
  );
}
