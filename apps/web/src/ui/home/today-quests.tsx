// M1.1 "Nhiệm vụ hôm nay": up to three quests the child can play now, each with its XP reward from the
// server, and one big button into the current one.
import { Link } from 'react-router';
import type { QuestSummary } from '@miu/schema/game';
import { T } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { playPath, say, stepProgress, type PlayerData } from '../player/player-data';
import { TextbookRef, textbookOf } from '../player/textbook-ref';

const MAX_ROWS = 3;

/** Playable quests, the one in progress first (same order as `currentQuest`), then catalogue order. */
export function todayQuests(quests: readonly QuestSummary[]): QuestSummary[] {
  const playable = quests.filter((q) => q.quest.status === 'active' && (q.state === 'in-progress' || q.state === 'open'));
  return [...playable.filter((q) => q.state === 'in-progress'), ...playable.filter((q) => q.state === 'open')].slice(0, MAX_ROWS);
}

function QuestRow({ summary, first, data }: { summary: QuestSummary; first: boolean; data: PlayerData }) {
  const { quest } = summary;
  const title = say(quest.title, data.character);
  const { done, total } = stepProgress(summary);
  const textbook = textbookOf(summary);
  return (
    <li className={`today-row${first ? ' today-row--current' : ''}`} data-id={`home-today-quest-${quest.id}`}>
      <Link to={playPath(summary)} className="today-row-link">
        <Icon name={first ? 'glowingStar' : 'star'} size={32} />
        <span className="today-row-text">
          {textbook ? <TextbookRef textbook={textbook} dataId={`home-today-textbook-${quest.id}`} /> : null}
          <span className="today-row-title" data-id={first ? 'home-today-quest' : undefined}>
            {title}
          </span>
          {first && quest.status === 'active' ? <span className="today-row-summary">{say(quest.summary, data.character)}</span> : null}
          <span className="today-row-meta">
            {first ? <span data-id="home-today-progress">
                <T k="common.progress" params={{ done, total }} />
              </span> : null}
            {quest.status === 'active' ? <span className="today-xp">+{quest.reward.xp} XP</span> : null}
          </span>
        </span>
        <span className="today-chevron" aria-hidden="true">
          ›
        </span>
      </Link>
    </li>
  );
}

export function TodayQuests({ data }: { data: PlayerData }) {
  const rows = todayQuests(data.quests);
  const current = rows[0];
  return (
    <section className="panel home-today" data-id="home-today" aria-labelledby="home-today-title">
      <h2 id="home-today-title" className="panel-title">
        <Icon name="scroll" size={36} />
        <T k="home.today" />
      </h2>
      {current ? (
        <>
          <ol className="today-list">
            {rows.map((summary, i) => (
              <QuestRow key={summary.quest.id} summary={summary} first={i === 0} data={data} />
            ))}
          </ol>
          <Link to={playPath(current)} className={buttonClass('primary', { block: true })} data-id="home-today-play">
            <T k={current.state === 'in-progress' ? 'home.continue' : 'home.start'} />
          </Link>
        </>
      ) : (
        <p className="hint">
          <T k="home.allDone" params={{ name: data.character.name }} />
        </p>
      )}
    </section>
  );
}
