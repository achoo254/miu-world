// NEW SCREEN part (owner, 09/10/2026: the child plays only at home, every day): "Bài hôm nay", one textbook lesson
// on another map for each Vietnam day, with the way there. A card on Home and a chip over the game while she is
// at home. The pick is `dailyLesson` of packages/quest; nothing extra is paid for it.
import { Link } from 'react-router';
import type { QuestSummary } from '@miu/schema/game';
import { dailyLesson } from '@miu/quest/daily-lesson';
import { vietnamDay } from '@miu/quest/live-event';
import { T } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { playPath, say, type PlayerData } from '../player/player-data';
import { TextbookRef, textbookOf } from '../player/textbook-ref';
import { Say, titleOf } from '../quest/content-text';
import { HOME_REGION, findRegion } from '../region/regions';
import './daily-lesson.css';

/** Today's lesson away from home among her quests (textbook lessons only), or null when all are finished. */
export function todaysLesson(quests: readonly QuestSummary[], now: number = Date.now()): QuestSummary | null {
  const lessons = quests.filter((q) => textbookOf(q) !== null);
  const pick = dailyLesson(
    lessons.map((q) => ({ id: q.quest.id, region: q.quest.region, state: q.state })),
    vietnamDay(now),
    HOME_REGION,
  );
  return lessons.find((q) => q.quest.id === pick?.id) ?? null;
}

/** The name of the map a lesson is on. */
const mapOf = (summary: QuestSummary): string => findRegion(summary.quest.region)?.name ?? summary.quest.region;

export function DailyLessonCard({ data }: { data: PlayerData }) {
  const lesson = todaysLesson(data.quests);
  if (!lesson) return null;
  const fill = (line: string): string => say(line, data.character);
  const textbook = textbookOf(lesson);
  return (
    <section className="panel home-daily" data-id="home-daily" aria-labelledby="home-daily-title">
      {/* One row: what and where on the left, the way there on the right (it wraps under on a narrow phone). */}
      <div className="home-daily-text">
        <h2 id="home-daily-title" className="home-daily-title">
          <Icon name="glowingStar" size={28} />
          <T k="daily.title" />
          <span className="home-daily-where" data-id="home-daily-map">
            <T k={lesson.state === 'in-progress' ? 'daily.resumeAt' : 'daily.at'} params={{ map: mapOf(lesson) }} />
          </span>
        </h2>
        <strong className="home-daily-lesson" data-id="home-daily-lesson">
          <Say text={titleOf(lesson.quest)} fill={fill} />
        </strong>
        {textbook ? <TextbookRef textbook={textbook} dataId="home-daily-textbook" /> : null}
      </div>
      <Link to={playPath(lesson)} className={buttonClass('primary')} data-id="home-daily-go">
        <T k="daily.go" params={{ map: mapOf(lesson) }} />
      </Link>
    </section>
  );
}

/**
 * The chip over the game while she is at home: today's lesson and its map; tapping it takes her there (`onGo`, the
 * play screen's own way to change quest and map).
 */
export function DailyLessonChip({ lesson, onGo }: { lesson: QuestSummary; onGo: (lesson: QuestSummary) => void }) {
  return (
    <button type="button" className="daily-chip" data-id="play-daily" onClick={() => onGo(lesson)}>
      <Icon name="glowingStar" size={28} />
      <span className="daily-chip-text">
        <span className="daily-chip-label">
          <T k="daily.title" />
        </span>
        <T k="daily.go" params={{ map: mapOf(lesson) }} />
      </span>
    </button>
  );
}
