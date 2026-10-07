// M1.6 event page and Event Quest (Master Plan §6 Live World; mock "gameplay-event-progression" panel 7): the event's
// host greets the player, the quests of the event with what is done in this window, a quiet note of how long it is
// open, the limited rewards with how far she is toward each, and the event's practice. Everything is the server's
// (`GET /api/events/:id`, by its clock): before the event opens it says when; after it closes the page is gone.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { fillPlayerName } from '@miu/quest/player-name';
import type { EventRewardDto, LiveEventDto } from '@miu/schema/live-event';
import { errorMessage } from '../api-client';
import { mapBoth, pairOf } from '../i18n/i18n';
import { Bi, T } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { ProgressBar } from '../kit/progress-bar';
import { isOpen, loadEvent, nextEventQuest, shortDate } from './event-api';
import { EventWhen } from './event-banner';
import { EventRewardPicture } from './event-reward-card';
import './event.css';

function RewardRow({ reward, event }: { reward: EventRewardDto; event: LiveEventDto }) {
  const goal =
    reward.goal.kind === 'quests'
      ? pairOf('event.goalQuests', { total: event.quests.length, done: event.quests.filter((q) => q.done).length })
      : pairOf('event.goalScore', { score: reward.goal.score });
  return (
    <li className="event-reward-row" data-id={`event-reward-row-${reward.id}`} data-earned={reward.earned}>
      <EventRewardPicture kind={reward.kind} item={reward.item} size={48} />
      <span className="event-reward-text">
        <strong>
          <Bi {...reward.name} />
        </strong>
        {reward.commemorative ? (
          <span className="badge">
            <T k="event.rewardKeepsake" />
          </span>
        ) : null}
        <span className="hint">
          <Bi {...goal} />
        </span>
        {!reward.earned ? <ProgressBar done={reward.progress} total={reward.target} label={`${reward.progress}/${reward.target}`} /> : null}
      </span>
      {reward.earned ? (
        <span className="event-reward-done">
          <Icon name="checkMark" size={28} />
          <T k="event.rewardEarned" />
        </span>
      ) : null}
    </li>
  );
}

export function EventPanel({ eventId, name, onClose, onPractice }: { eventId: string; name: string; onClose: () => void; onPractice?: () => void }) {
  const [event, setEvent] = useState<LiveEventDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    let alive = true;
    loadEvent(eventId).then(
      (dto) => alive && setEvent(dto),
      (err: unknown) => alive && setError(errorMessage(err)),
    );
    return () => {
      alive = false;
    };
  }, [eventId]);
  const fill = (text: string): string => fillPlayerName(text, name);
  const host = event?.scene.characters.find((c) => c.id === event.scene.meetAt);
  const open = event ? isOpen(event) : false;
  const next = event ? nextEventQuest(event) : null;
  const play = (questId: string): void => {
    if (!event) return;
    navigate(`/play?region=${encodeURIComponent(event.region)}&quest=${encodeURIComponent(questId)}`);
  };
  return (
    <Modal title={event ? <Bi {...event.name} /> : <T k="event.rail" />} onClose={onClose} dataId="event-panel" variant="scene" size="wide">
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
      {!event && !error ? (
        <p role="status">
          <T k="common.loading" />
        </p>
      ) : null}
      {event ? (
        <div className="event-page" data-state={event.state}>
          <div className="event-page-top">
            <EventWhen event={event} />
            {open ? (
              <span className="hint">
                <T k="event.openUntil" params={{ date: shortDate(event.lastDay) }} />
              </span>
            ) : null}
          </div>
          <div className="npc-say">
            <span className="event-host-icon" aria-hidden="true">
              <Icon name="trophy" size={56} />
            </span>
            <p className="npc-bubble parchment">
              {host ? <span className="npc-name">{fill(host.name)}</span> : null}
              <Bi {...mapBoth(event.greeting, fill)} />
            </p>
          </div>
          <p className="event-description">
            <Bi {...mapBoth(event.description, fill)} />
          </p>
          {!open ? (
            <p className="event-not-open parchment" data-id="event-not-open">
              <T k="event.notOpenYet" params={{ date: shortDate(event.firstDay) }} />
            </p>
          ) : null}
          <div className="event-columns">
            <section className="event-section parchment" aria-labelledby="event-quests-title">
              <h3 id="event-quests-title">
                <T k="event.questsTitle" />{' '}
                <span className="hint">
                  <T k="event.questsDone" params={{ done: event.quests.filter((q) => q.done).length, total: event.quests.length }} />
                </span>
              </h3>
              <ul className="event-quest-list">
                {event.quests.map((q) => (
                  <li key={q.id} className="event-quest" data-id={`event-quest-${q.id}`} data-done={q.done}>
                    <Icon name={q.done ? 'checkMark' : 'scroll'} size={28} />
                    <span className="event-quest-text">
                      <strong>
                        <Bi {...q.title} />
                      </strong>
                      <span className="hint">
                        <T k="event.questAt" params={{ keeper: q.keeper }} />
                      </span>
                    </span>
                    {open ? (
                      <button type="button" className={buttonClass('secondary', { small: true })} data-id={`event-play-${q.id}`} onClick={() => play(q.id)}>
                        {q.done ? <T k="event.questDone" /> : <T k="event.questAt" params={{ keeper: q.keeper }} />}
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
              {open && next ? (
                <button type="button" className={buttonClass('primary', { block: true })} data-id="event-go" onClick={() => play(next.id)}>
                  <Icon name="map" size={28} />
                  <T k="event.go" />
                </button>
              ) : null}
            </section>
            <section className="event-section parchment" aria-labelledby="event-rewards-title">
              <h3 id="event-rewards-title">
                <T k="event.rewardsTitle" />
              </h3>
              <ul className="event-reward-rows">
                {event.rewards.map((r) => (
                  <RewardRow key={r.id} reward={r} event={event} />
                ))}
              </ul>
              {event.bestExamScore !== null ? (
                <p className="hint" data-id="event-best-score">
                  <T k="event.bestScore" params={{ score: event.bestExamScore }} />
                </p>
              ) : null}
              <p className="hint">
                <T k="event.keepForever" />
              </p>
            </section>
          </div>
          {event.practice && onPractice ? (
            <section className="event-section event-practice parchment" aria-labelledby="event-practice-title">
              <h3 id="event-practice-title">
                <T k="event.practiceTitle" />
              </h3>
              <p>
                <T k="event.practiceText" />
              </p>
              <button type="button" className={buttonClass('primary')} data-id="event-practice" onClick={onPractice}>
                <Icon name="books" size={28} />
                <T k="event.practiceOpen" />
              </button>
            </section>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
