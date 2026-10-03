// The region screen's parts (mock M2.1 "Khu vực chi tiết"), driven by the region's data and the server's
// quest list only, so a new region needs a `regions.json` entry, not new components:
// - RegionBackdrop: the region's own map behind everything (`pnpm assets:regions`), or the sky.
// - RegionIntro: the wooden sign (name, subject), the speech bubble, progress with the region's chest and its
//   reward tiers (region-reward-panel.tsx), the button.
// - QuestBoard: the parchment board listing every chapter and every quest (contract D6), with stars. The
//   game shows the same board over the paused map, where picking a quest switches to it in place.
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router';
import type { ProgressResponse, QuestSummary } from '@miu/schema/game';
import type { Region } from '@miu/schema/region';
import type { TextKey } from '../i18n/i18n';
import { T, useT } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { SkyScene } from '../kit/sky-scene';
import { StarRating } from '../kit/star-rating';
import { assetUrl, REGION_BACKDROPS } from '../kit/ui-art';
import { chapters, playPath, say, stepProgress, type PlayerData } from '../player/player-data';
import { TextbookRef, textbookOf } from '../player/textbook-ref';
import { isPlayable, recommendedQuest, regionProgress } from './region-board';
import { RegionRewardPanel } from './region-reward-panel';
import './region.css';

/** The region's map as the backdrop (no image yet: the sky scene, so a new region still works). */
export function RegionBackdrop({ regionId, children }: { regionId: string; children: ReactNode }) {
  const image = REGION_BACKDROPS[regionId];
  if (!image) return <SkyScene>{children}</SkyScene>;
  return (
    <div className="region-scene" style={{ '--region-backdrop': `url("${assetUrl(image)}")` } as CSSProperties} data-id="region-backdrop">
      {children}
    </div>
  );
}

const STATE_TEXT: Record<QuestSummary['state'], TextKey> = {
  open: 'region.state.open',
  'in-progress': 'region.state.inProgress',
  completed: 'region.state.completed',
};

/** Quest titles repeat their region ("Khu rừng bí mật – Chương 1: Lá thần"); on the region's own board the chapter part is enough. */
export function boardTitle(title: string, regionName: string): string {
  const prefix = `${regionName} – `;
  return title.startsWith(prefix) ? title.slice(prefix.length) : title;
}

export function RegionIntro({
  region,
  quests,
  data,
  onProgress = () => undefined,
}: {
  region: Region;
  quests: readonly QuestSummary[];
  data: PlayerData;
  /** Her totals after a chest is claimed here. */
  onProgress?: (progress: ProgressResponse) => void;
}) {
  const { done, total } = regionProgress(quests);
  const next = recommendedQuest(quests);
  const fill = (text: string) => say(text, data.character);
  return (
    <div className="region-intro">
      <h1 id="region-title" className="ribbon region-sign">
        {fill(region.name)}
        {region.subject ? <span className="region-sign-subject">{region.subject}</span> : null}
      </h1>
      <p className="region-bubble" data-id="region-description">
        {fill(region.description ?? region.tagline)}
      </p>
      <RegionRewardPanel region={region.id} done={done} total={total} name={data.character.name} onProgress={onProgress} />
      {/* Which lessons of the books the region plays, so a parent finds the one taught in class this week. */}
      {region.book ? (
        <p className="region-book" data-id="region-book">
          <T k="region.bookLine" params={{ book: region.book }} />
        </p>
      ) : null}
      {next ? (
        <Link to={playPath(next)} className={buttonClass('primary', { block: true })} data-id="region-explore">
          <T k={next.state === 'completed' ? 'common.playAgain' : 'region.exploreNow'} /> →
        </Link>
      ) : null}
    </div>
  );
}

/** In the game: picking a row switches to that quest on the spot, and the quest being played is marked. */
export interface BoardPick {
  current: string | null;
  onPick: (summary: QuestSummary) => void;
}

function BoardRow({ summary, region, data, pick }: { summary: QuestSummary; region: Region; data: PlayerData; pick?: BoardPick }) {
  const { done, total } = stepProgress(summary);
  const title = boardTitle(say(summary.quest.title, data.character), say(region.name, data.character));
  const stub = summary.quest.status === 'stub';
  const playable = isPlayable(summary);
  const textbook = textbookOf(summary);
  const current = pick?.current === summary.quest.id;
  const { t } = useT();
  const goArrow = (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  return (
    <li className={`board-row${playable ? '' : ' board-row--locked'}`} data-id={`region-quest-${summary.quest.id}`} data-state={summary.state}>
      <div className="board-row-text">
        {textbook ? <TextbookRef textbook={textbook} dataId={`region-quest-textbook-${summary.quest.id}`} /> : null}
        <strong className="board-row-title">{title}</strong>
        {stub ? (
          <span className="badge">
            <T k="common.comingSoon" />
          </span>
        ) : (
          <span className="board-row-status">
            <StarRating stars={summary.progress.stars ?? 0} size={24} dataId={`region-quest-stars-${summary.quest.id}`} />
            {current ? (
              <span className="badge" data-id={`region-quest-current-${summary.quest.id}`}>
                <T k="region.playing" />
              </span>
            ) : null}
            {summary.state === 'completed' ? null : (
              <span className="board-row-progress" data-id={`region-quest-progress-${summary.quest.id}`}>
                <T k={STATE_TEXT[summary.state]} /> · <T k="common.progress" params={{ done, total }} />
              </span>
            )}
          </span>
        )}
      </div>
      {playable && pick ? (
        <button type="button" className="board-row-go" aria-label={t(summary.state === 'completed' ? 'region.playAgainQuest' : 'region.exploreQuest', { title })} data-id={`region-play-${summary.quest.id}`} onClick={() => pick.onPick(summary)}>
          {goArrow}
        </button>
      ) : playable ? (
        <Link to={playPath(summary)} className="board-row-go" aria-label={t('region.exploreQuest', { title })} data-id={`region-play-${summary.quest.id}`}>
          {goArrow}
        </Link>
      ) : (
        <Icon name="locked" size={32} label={t('common.comingSoon')} />
      )}
    </li>
  );
}

function chapterNamedByQuest(list: readonly QuestSummary[], chapter: number, region: Region, data: PlayerData): boolean {
  const [only] = list;
  return list.length === 1 && only !== undefined && boardTitle(say(only.quest.title, data.character), say(region.name, data.character)).startsWith(`Chương ${chapter}`);
}

export function QuestBoard({ region, quests, data, pick }: { region: Region; quests: readonly QuestSummary[]; data: PlayerData; pick?: BoardPick }) {
  const { t } = useT();
  return (
    <section className="parchment quest-board" aria-labelledby="quest-board-title" data-id="region-board">
      <h2 id="quest-board-title" className="quest-board-title">
        <T k="region.board" />
      </h2>
      {chapters([...quests], region.id).map(({ chapter, quests: list }) => (
        <section key={chapter} className="board-chapter" aria-label={t('region.chapter', { chapter })} data-id={`region-chapter-${chapter}`}>
          {/* A chapter of one quest titled "Chương N…" needs no caption on screen (screen readers keep it). */}
          <h3 className={chapterNamedByQuest(list, chapter, region, data) ? 'visually-hidden' : 'board-chapter-title'}>
            <T k="region.chapter" params={{ chapter }} />
          </h3>
          <ul className="board-list">
            {list.map((q) => (
              <BoardRow key={q.quest.id} summary={q} region={region} data={data} pick={pick} />
            ))}
          </ul>
        </section>
      ))}
    </section>
  );
}
