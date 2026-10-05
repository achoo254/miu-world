// NEW SCREEN (Master Plan §6, progress view), styled like the skill tree's parchment rows (M1.7): a player's
// learning progress in Hồ sơ, and the same panel for each player in Quản lý tài khoản. Subjects with their
// lessons, the strongest and weakest skills, three lessons to play next, play time per week and a few counts.
// Every number is the server's (`GET /api/progress`, `GET /api/players/:id/progress`).
import { useCallback } from 'react';
import { Link } from 'react-router';
import { PlayerProgressDto, type ProgressSkill } from '@miu/schema/progress';
import { api } from '../api-client';
import { T, useT } from '../i18n/use-t';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { ProgressBar } from '../kit/progress-bar';
import { useLoaded } from '../progression/progression-api';
import './progress.css';

export function loadOwnProgress(): Promise<PlayerProgressDto> {
  return api('GET', '/progress', PlayerProgressDto);
}

export function loadPlayerProgress(playerId: string): Promise<PlayerProgressDto> {
  return api('GET', `/players/${encodeURIComponent(playerId)}/progress`, PlayerProgressDto);
}

const playLink = (region: string, quest: string): string => `/play?${new URLSearchParams({ region, quest }).toString()}`;

/** "05/10" for a Monday given as YYYY-MM-DD. */
const dayMonth = (isoDate: string): string => `${isoDate.slice(8, 10)}/${isoDate.slice(5, 7)}`;

function SkillChips({ skills, dataId }: { skills: ProgressSkill[]; dataId: string }) {
  return (
    <ul className="progress-chips" data-id={dataId}>
      {skills.map((skill) => (
        <li key={skill.skillId} className="progress-chip" data-id={`${dataId}-${skill.skillId}`}>
          {skill.name} <span className="progress-chip-level">Lv.{skill.level}</span>
        </li>
      ))}
    </ul>
  );
}

function WeekBars({ progress }: { progress: PlayerProgressDto }) {
  const { t } = useT();
  const most = Math.max(1, ...progress.weeks.map((w) => w.minutes));
  const last = progress.weeks.length - 1;
  return (
    <ol className="progress-weeks" data-id="progress-weeks">
      {progress.weeks.map((week, i) => {
        const label = i === last ? t('progress.thisWeek') : t('progress.weekOf', { date: dayMonth(week.weekStart) });
        const minutes = t('progress.minutes', { count: week.minutes });
        return (
          <li key={week.weekStart} className="progress-week" aria-label={t('progress.timeLabel', { week: label, minutes })} data-id={`progress-week-${i}`}>
            <span className="progress-week-value">{minutes}</span>
            <span className="progress-week-track" aria-hidden="true">
              <span className="progress-week-fill" style={{ height: `${Math.round((week.minutes / most) * 100)}%` }} />
            </span>
            <span className="progress-week-label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** The progress itself; `playable`: the lessons link into the game (the player's own view, not the owner's). */
export function ProgressView({ progress, playable, dataId }: { progress: PlayerProgressDto; playable: boolean; dataId: string }) {
  const { t } = useT();
  const { counts } = progress;
  return (
    <div className="progress-view" data-id={dataId}>
      <ul className="progress-counts" data-id={`${dataId}-counts`}>
        <li className="progress-count"><T k="progress.level" params={{ level: counts.playerLevel }} /></li>
        <li className="progress-count"><T k="progress.lessons" params={{ done: counts.lessonsDone, total: counts.lessonsTotal }} /></li>
        <li className="progress-count"><T k="progress.threeStars" params={{ count: counts.threeStars }} /></li>
        <li className="progress-count"><T k="progress.minigames" params={{ count: counts.minigameRuns }} /></li>
        <li className="progress-count"><T k="progress.regions" params={{ count: counts.regionsComplete }} /></li>
        <li className="progress-count"><T k="progress.collectibles" params={{ count: counts.collectibles }} /></li>
      </ul>

      <section className="progress-block" aria-label={t('progress.subjects')}>
        <h3 className="progress-block-title"><T k="progress.subjects" /></h3>
        <ul className="progress-subjects">
          {progress.subjects.map((subject) => (
            <li key={subject.subjectId} className="progress-subject" data-id={`${dataId}-subject-${subject.subjectId}`}>
              <div className="progress-subject-head">
                <strong>{subject.name}</strong>
                <span className="progress-chip-level">Lv.{subject.level}</span>
              </div>
              <ProgressBar done={subject.lessonsDone} total={subject.lessonsTotal} label={t('progress.subjectLessons', { done: subject.lessonsDone, total: subject.lessonsTotal })} />
              <span className="hint"><T k="progress.subjectLessons" params={{ done: subject.lessonsDone, total: subject.lessonsTotal }} /></span>
            </li>
          ))}
        </ul>
      </section>

      <div className="progress-columns">
        <section className="progress-block" aria-label={t('progress.strong')}>
          <h3 className="progress-block-title"><Icon name="trophy" size={24} /> <T k="progress.strong" /></h3>
          {progress.strong.length > 0 ? <SkillChips skills={progress.strong} dataId={`${dataId}-strong`} /> : <p className="hint"><T k="progress.noStrong" /></p>}
        </section>
        {progress.weak.length > 0 ? (
          <section className="progress-block" aria-label={t('progress.weak')}>
            <h3 className="progress-block-title"><Icon name="leaf" size={24} /> <T k="progress.weak" /></h3>
            <SkillChips skills={progress.weak} dataId={`${dataId}-weak`} />
          </section>
        ) : null}
      </div>

      <section className="progress-block" aria-label={t('progress.suggestions')}>
        <h3 className="progress-block-title"><Icon name="lightBulb" size={24} /> <T k="progress.suggestions" /></h3>
        {progress.suggestions.length > 0 ? (
          <ul className="progress-suggestions">
            {progress.suggestions.map((s) => (
              <li key={s.questId} className="progress-suggestion" data-id={`${dataId}-suggestion-${s.questId}`}>
                <div className="progress-suggestion-text">
                  <strong>{s.title}</strong>
                  <span className="hint">{s.reason === 'new' ? <T k="progress.reasonNew" /> : <T k="progress.reasonImprove" params={{ stars: s.stars ?? 0 }} />}</span>
                </div>
                {playable ? (
                  <Link to={playLink(s.region, s.questId)} className={buttonClass('primary', { small: true })} data-id={`${dataId}-play-${s.questId}`}>
                    <T k="progress.play" />
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint"><T k="progress.noSuggestions" /></p>
        )}
      </section>

      <section className="progress-block" aria-label={t('progress.time')}>
        <h3 className="progress-block-title"><Icon name="mantelpieceClock" size={24} /> <T k="progress.time" /></h3>
        <WeekBars progress={progress} />
      </section>
    </div>
  );
}

/** Loads and shows a progress view, with a retry when the read fails. */
export function ProgressLoader({ load, playable, dataId }: { load: () => Promise<PlayerProgressDto>; playable: boolean; dataId: string }) {
  const { data, failed, retry } = useLoaded(load);
  if (failed) {
    return (
      <div className="row" role="alert">
        <p className="error"><T k="progress.loadFailed" /></p>
        <button type="button" className={buttonClass('ghost', { small: true })} onClick={retry}>
          <T k="common.retry" />
        </button>
      </div>
    );
  }
  if (!data) {
    return (
      <p role="status">
        <T k="common.loading" />
      </p>
    );
  }
  return <ProgressView progress={data} playable={playable} dataId={dataId} />;
}

/** Hồ sơ: the selected player's own progress. */
export function OwnProgressPanel() {
  return (
    <section className="panel progress-panel" aria-labelledby="progress-title" data-id="profile-progress">
      <h2 id="progress-title" className="panel-title">
        <Icon name="books" size={36} />
        <T k="progress.title" />
      </h2>
      <ProgressLoader load={loadOwnProgress} playable dataId="progress" />
    </section>
  );
}

/** The account area's view of one player (loaded when opened). */
export function PlayerProgress({ playerId }: { playerId: string }) {
  const load = useCallback(() => loadPlayerProgress(playerId), [playerId]);
  return <ProgressLoader load={load} playable={false} dataId={`player-progress-${playerId}`} />;
}
