// NEW SCREEN (Master Plan §6, §8: kiểm duyệt), in the visual language of the account area (panels on the sky
// scene): the moderator's report queue, the decision on each report, and the emergency switch for online play.
// Reached at /kiem-duyet; the server decides who is a moderator (404 for anyone else), and this screen sends
// anyone else home. Works from phone width up: cards stack, actions wrap.
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router';
import {
  LOCK_DAYS,
  ModerationActionResponse,
  ModeratorStatus,
  ReportListResponse,
  type ModerationActionRequest,
  type ReportFilter,
  type ReportView,
} from '@miu/schema/moderation';
import type { OnlineMode } from '@miu/schema/multiplayer';
import { SPECIES } from '../../game/content/characters';
import { ApiError, api, errorMessage } from '../api-client';
import { Icon } from '../kit/art';
import { buttonClass } from '../kit/button';
import { SkyScene, PageLoading } from '../kit/sky-scene';
import { Tabs } from '../kit/tabs';
import { T, useT } from '../i18n/use-t';
import type { TextKey } from '../i18n/i18n';
import './moderation.css';

const MODES: readonly OnlineMode[] = ['on', 'interaction-off', 'off'];
const MODE_KEY: Record<OnlineMode, TextKey> = { on: 'moderation.mode.on', 'interaction-off': 'moderation.mode.interaction', off: 'moderation.mode.off' };
const STATUS_KEY: Record<ReportView['status'], TextKey> = {
  open: 'moderation.status.open',
  dismissed: 'moderation.status.dismissed',
  warned: 'moderation.status.warned',
  renamed: 'moderation.status.renamed',
  locked: 'moderation.status.locked',
};

/** A species by its Vietnamese name ("Mèo"), not its id; an id the content no longer has shows as it is. */
const speciesName = (id: string): string => SPECIES.find((s) => s.id === id)?.name ?? id;

/** A time as the moderator reads it (her device's time zone). */
const when = (iso: string): string => new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });

type Access = { kind: 'loading' } | { kind: 'denied' } | { kind: 'error'; message: string } | { kind: 'ok'; mode: OnlineMode };

/** The emergency switch: three choices, each asked once more before it takes effect for everyone. */
function OnlineSwitchPanel({ mode, onChanged }: { mode: OnlineMode; onChanged(mode: OnlineMode): void }) {
  const [asking, setAsking] = useState<OnlineMode | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apply = async (next: OnlineMode): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      onChanged((await api('PUT', '/moderation/online-mode', ModeratorStatus, { mode: next })).onlineMode);
      setAsking(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel moderation-switch" data-id="moderation-switch" aria-labelledby="moderation-switch-title">
      <div className="panel-title">
        <Icon name="key" size={40} />
        <h2 id="moderation-switch-title">
          <T k="moderation.switch.title" />
        </h2>
      </div>
      <p className="hint">
        <T k="moderation.switch.hint" />
      </p>
      <p className={mode === 'on' ? 'badge' : 'badge badge--warn'} data-id="moderation-switch-now">
        <T k="moderation.switch.now" />: <T k={MODE_KEY[mode]} />
      </p>
      <div className="moderation-actions">
        {MODES.filter((m) => m !== mode).map((m) => (
          <button key={m} type="button" className={buttonClass(m === 'on' ? 'primary' : 'danger', { small: true })} data-id={`moderation-switch-${m}`} disabled={busy} onClick={() => setAsking(m)}>
            <T k={MODE_KEY[m]} />
          </button>
        ))}
      </div>
      {asking ? (
        <div className="moderation-confirm" role="alertdialog" aria-labelledby="moderation-switch-confirm">
          <p id="moderation-switch-confirm">
            <T k={`moderation.switch.confirm.${asking === 'interaction-off' ? 'interaction' : asking}`} />
          </p>
          <div className="moderation-actions">
            <button type="button" className={buttonClass(asking === 'on' ? 'primary' : 'danger', { small: true })} data-id="moderation-switch-yes" disabled={busy} onClick={() => void apply(asking)}>
              <T k="moderation.confirm.yes" />
            </button>
            <button type="button" className={buttonClass('ghost', { small: true })} data-id="moderation-switch-no" disabled={busy} onClick={() => setAsking(null)}>
              <T k="moderation.confirm.no" />
            </button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
    </section>
  );
}

type Choice = { action: 'dismiss' | 'warn' | 'rename' | 'lock-permanent' } | { action: 'lock-temp'; lockDays: (typeof LOCK_DAYS)[number] };

const choiceKey = (c: Choice): string => (c.action === 'lock-temp' ? `lock-temp-${c.lockDays}` : c.action);

const CHOICES: readonly Choice[] = [{ action: 'dismiss' }, { action: 'warn' }, { action: 'rename' }, ...LOCK_DAYS.map((d) => ({ action: 'lock-temp' as const, lockDays: d })), { action: 'lock-permanent' }];

/** One report: who, why, where, what was around it, and the decision (asked once more before it is sent). */
function ReportCard({ report, onDecided }: { report: ReportView; onDecided(): void }) {
  const { t } = useT();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = (c: Choice): string => (c.action === 'lock-temp' ? t('moderation.action.lock-temp', { days: c.lockDays }) : t(`moderation.action.${c.action}`));
  const decide = async (c: Choice): Promise<void> => {
    setBusy(true);
    setError(null);
    const body: ModerationActionRequest = { ...c, ...(note.trim() ? { note: note.trim() } : {}) };
    try {
      await api('POST', `/moderation/reports/${report.id}/action`, ModerationActionResponse, body);
      setChoice(null);
      onDecided();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  const { reported, incident } = report;
  return (
    <li className="panel moderation-report" data-id={`moderation-report-${report.id}`}>
      <div className="moderation-report-head">
        <span className={report.status === 'open' ? 'badge badge--warn' : 'badge'}>
          <T k={STATUS_KEY[report.status]} />
        </span>
        <span className="hint">{when(report.createdAt)}</span>
      </div>
      <dl className="moderation-facts">
        <dt>
          <T k="moderation.reported" />
        </dt>
        <dd>
          <strong>{reported.displayName}</strong> ({speciesName(reported.species)}) · <T k="moderation.openReports" params={{ count: reported.openReports }} />
          {reported.restriction ? (
            <span className="badge badge--warn moderation-lock">
              <T k={reported.restriction.kind === 'hidden' ? 'moderation.lock.hidden' : 'moderation.lock.locked'} />
              {reported.restriction.until ? ` · ${when(reported.restriction.until)}` : ''}
            </span>
          ) : null}
        </dd>
        <dt>
          <T k="moderation.reason" />
        </dt>
        <dd>
          <T k={`online.report.${report.reason}`} />
        </dd>
        <dt>
          <T k="moderation.reporter" />
        </dt>
        <dd>
          {report.reporter.displayName} ({speciesName(report.reporter.species)})
        </dd>
        <dt>
          <T k="moderation.map" />
        </dt>
        <dd>{report.mapId ?? '—'}</dd>
        <dt>
          <T k="moderation.witnesses" />
        </dt>
        <dd>{incident === null ? <T k="moderation.incidentGone" /> : incident.witnesses.length === 0 ? '—' : incident.witnesses.map((w) => w.displayName).join(', ')}</dd>
      </dl>
      {incident && incident.lines.length > 0 ? (
        <ol className="moderation-lines" aria-label={t('moderation.lines')}>
          {incident.lines.map((line, i) => (
            <li key={i} className={`moderation-line moderation-line--${line.by}`}>
              <span className="moderation-line-who">
                <T k={line.by === 'reported' ? 'moderation.reported' : 'moderation.reporter'} /> · <T k="moderation.secondsBefore" params={{ seconds: line.secondsBefore }} />
              </span>
              <span>{line.text}</span>
            </li>
          ))}
        </ol>
      ) : null}
      {report.note ? (
        <p className="hint">
          <T k="moderation.noteShown" />: {report.note}
        </p>
      ) : null}
      <label className="moderation-note">
        <span>
          <T k="moderation.noteLabel" />
        </span>
        <input type="text" maxLength={300} value={note} data-id={`moderation-note-${report.id}`} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="moderation-actions">
        {CHOICES.map((c) => (
          <button
            key={choiceKey(c)}
            type="button"
            className={buttonClass(c.action.startsWith('lock') ? 'danger' : c.action === 'dismiss' ? 'ghost' : 'secondary', { small: true })}
            data-id={`moderation-action-${choiceKey(c)}`}
            disabled={busy}
            onClick={() => setChoice(c)}
          >
            {label(c)}
          </button>
        ))}
      </div>
      {choice ? (
        <div className="moderation-confirm" role="alertdialog" aria-label={label(choice)}>
          <p>
            <T k="moderation.confirm.action" params={{ action: label(choice), who: reported.displayName }} />
          </p>
          <div className="moderation-actions">
            <button type="button" className={buttonClass('primary', { small: true })} data-id="moderation-action-yes" disabled={busy} onClick={() => void decide(choice)}>
              <T k="moderation.confirm.yes" />
            </button>
            <button type="button" className={buttonClass('ghost', { small: true })} data-id="moderation-action-no" disabled={busy} onClick={() => setChoice(null)}>
              <T k="moderation.confirm.no" />
            </button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
    </li>
  );
}

export function ModerationScreen() {
  const { t } = useT();
  const [access, setAccess] = useState<Access>({ kind: 'loading' });
  const [filter, setFilter] = useState<ReportFilter>('open');
  const [reports, setReports] = useState<ReportView[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api('GET', '/moderation/me', ModeratorStatus).then(
      (status) => live && setAccess({ kind: 'ok', mode: status.onlineMode }),
      (err: unknown) => live && setAccess(err instanceof ApiError && err.status === 404 ? { kind: 'denied' } : { kind: 'error', message: errorMessage(err) }),
    );
    return () => {
      live = false;
    };
  }, []);

  /** Bumped to read the list again (after a decision, or "try again"). */
  const [readSeq, setReadSeq] = useState(0);
  const reload = (): void => {
    setListError(null);
    setReports(null);
    setReadSeq((n) => n + 1);
  };

  useEffect(() => {
    if (access.kind !== 'ok') return;
    let live = true;
    api('GET', `/moderation/reports?status=${filter}`, ReportListResponse).then(
      (list) => live && setReports(list.reports),
      (err: unknown) => live && setListError(errorMessage(err)),
    );
    return () => {
      live = false;
    };
  }, [access.kind, filter, readSeq]);

  if (access.kind === 'denied') return <Navigate to="/" replace />;
  return (
    <SkyScene>
      <main className="scene-content moderation" data-id="moderation">
        <header className="page-header">
          <Icon name="key" size={48} />
          <h1>
            <T k="moderation.title" />
          </h1>
          <span className="spacer" />
          <Link to="/" className={buttonClass('ghost')} data-id="moderation-back">
            <T k="common.back" />
          </Link>
        </header>
        {access.kind === 'loading' ? <PageLoading /> : null}
        {access.kind === 'error' ? (
          <p role="alert" className="error">
            {access.message}
          </p>
        ) : null}
        {access.kind === 'ok' ? (
          <>
            <OnlineSwitchPanel mode={access.mode} onChanged={(mode) => setAccess({ kind: 'ok', mode })} />
            <section className="panel moderation-queue" aria-labelledby="moderation-queue-title">
              <div className="panel-title">
                <h2 id="moderation-queue-title">
                  <T k="moderation.queue" />
                </h2>
              </div>
              <Tabs
                label={t('moderation.queue')}
                dataId="moderation-filter"
                active={filter}
                onChange={(next) => {
                  // The other list is read afresh: nothing of the last one shows meanwhile.
                  setListError(null);
                  setReports(null);
                  setFilter(next);
                }}
                items={[
                  { key: 'open', label: <T k="moderation.filter.open" /> },
                  { key: 'handled', label: <T k="moderation.filter.handled" /> },
                ]}
              >
                {listError ? (
                  <div className="row">
                    <p role="alert" className="error">
                      {listError}
                    </p>
                    <button type="button" className={buttonClass('ghost', { small: true })} onClick={reload}>
                      <T k="moderation.retry" />
                    </button>
                  </div>
                ) : reports === null ? (
                  <PageLoading />
                ) : reports.length === 0 ? (
                  <p className="hint" data-id="moderation-empty">
                    <T k={filter === 'open' ? 'moderation.emptyOpen' : 'moderation.emptyHandled'} />
                  </p>
                ) : (
                  <ul className="moderation-reports">
                    {reports.map((r) => (
                      <ReportCard
                        key={r.id}
                        report={r}
                        // A decision closes every open report on the same player: the list is read again.
                        onDecided={reload}
                      />
                    ))}
                  </ul>
                )}
              </Tabs>
            </section>
          </>
        ) : null}
      </main>
    </SkyScene>
  );
}
