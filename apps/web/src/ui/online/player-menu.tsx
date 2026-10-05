// NEW SCREEN, after mock `designs/multiplayer.png` frame 7 ("Báo cáo & Chặn người chơi"): the interaction menu on
// another player, opened with the Interact button next to her. A themed scene over the paused game: her name on
// the wooden banner, the actions on parchment. Wave, a canned line, invite to the party, add as a friend, block,
// report: every word comes from a fixed list (no typing, no voice). Companion bots are labelled and only get the
// friendly actions.
import { useState } from 'react';
import { REPORT_REASONS, SAFE_CANNED_CHATS, type ReportReason, type SafeCannedChat } from '@miu/schema/multiplayer';
import type { OnlinePlayer, SocialStore } from '../../game-bridge/social-store';
import { linesOf, type TextKey } from '../i18n/i18n';
import { Bi, T, useT } from '../i18n/use-t';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';

const REASON_LABEL: Record<ReportReason, TextKey> = {
  harassment: 'online.report.harassment',
  spam: 'online.report.spam',
  name: 'online.report.name',
  other: 'online.report.other',
};

type Step = 'actions' | 'lines' | 'block' | 'report';

/** The canned lines to pick from, each in the display language (the menu's "Câu có sẵn", the party's "Nhắn đội"). */
export function CannedLines({ onPick, dataId }: { onPick: (text: SafeCannedChat) => void; dataId: string }) {
  const lines = linesOf('online.cannedChats');
  return (
    <ul className="online-menu-lines" data-id={dataId}>
      {SAFE_CANNED_CHATS.map((text, i) => (
        <li key={text}>
          <button type="button" className="online-menu-line" data-id={`${dataId}-${i}`} onClick={() => onPick(text)}>
            <Bi vi={lines[i]?.vi ?? text} en={lines[i]?.en ?? text} />
          </button>
        </li>
      ))}
    </ul>
  );
}

interface MenuAction {
  id: string;
  icon: string;
  label: TextKey;
  /** Only for other players, not companion bots. */
  playersOnly?: boolean;
  danger?: boolean;
  run(): void;
}

export function PlayerMenu({ social, player }: { social: SocialStore; player: OnlinePlayer }) {
  const { t } = useT();
  const [step, setStep] = useState<Step>('actions');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const close = (): void => social.send({ type: 'close-menu' });
  const who = { vi: player.name, en: player.name };
  // The menu's actions, in order (mock frame 7: "Gửi lời mời kết bạn" next to inviting).
  const actions: MenuAction[] = [
    { id: 'wave', icon: '👋', label: 'online.menu.wave', run: () => social.send({ type: 'wave', to: player.id }) },
    { id: 'say', icon: '💬', label: 'online.menu.say', run: () => setStep('lines') },
    { id: 'invite', icon: '⭐', label: 'online.menu.invite', run: () => social.send({ type: 'invite', to: player.id }) },
    { id: 'befriend', icon: '🤝', label: 'online.menu.befriend', run: () => social.send({ type: 'befriend', to: player.id }) },
    { id: 'block', icon: '🚫', label: 'online.menu.block', playersOnly: true, danger: true, run: () => setStep('block') },
    { id: 'report', icon: '🚩', label: 'online.menu.report', playersOnly: true, danger: true, run: () => setStep('report') },
  ];

  const title = player.isBot ? `🤖 [${t('online.botLabel')}] ${player.name}` : player.name;
  return (
    <Modal title={title} onClose={close} dataId="online-menu" variant="scene">
      <button type="button" className="scene-close" data-id="online-menu-close" aria-label={t('common.close')} onClick={close}>
        ✕
      </button>
      <div className="parchment online-menu" role="group" data-step={step} aria-label={t('online.menu.label', { who })}>
        {step === 'actions' ? (
          <>
            {player.isBot ? (
              <p className="online-menu-note" data-id="online-menu-bot-note">
                <T k="online.menu.botNote" />
              </p>
            ) : null}
            <ul className="online-menu-actions">
              {actions
                .filter((action) => !(action.playersOnly && player.isBot))
                .map((action) => (
                  <li key={action.id}>
                    <button type="button" className={`online-menu-action${action.danger ? ' online-menu-action--danger' : ''}`} data-id={`online-menu-${action.id}`} onClick={action.run}>
                      <span className="online-menu-icon" aria-hidden="true">
                        {action.icon}
                      </span>
                      <T k={action.label} />
                    </button>
                  </li>
                ))}
            </ul>
          </>
        ) : null}
        {step === 'lines' ? <CannedLines dataId="online-menu-lines" onPick={(text) => social.send({ type: 'say', to: player.id, text })} /> : null}
        {step === 'block' ? (
          <div className="online-menu-confirm">
            <p>
              <T k="online.block.confirm" params={{ who }} />
            </p>
            <button type="button" className={buttonClass('danger', { block: true })} data-id="online-menu-block-yes" onClick={() => social.send({ type: 'block', id: player.id })}>
              <T k="online.block.yes" />
            </button>
          </div>
        ) : null}
        {step === 'report' ? (
          <fieldset className="online-menu-report" data-id="online-menu-report">
            <legend>
              <T k="online.report.title" />
            </legend>
            {REPORT_REASONS.map((r) => (
              <label key={r} className="online-menu-reason">
                <input type="radio" name="online-report-reason" value={r} checked={reason === r} onChange={() => setReason(r)} data-id={`online-menu-reason-${r}`} />
                <T k={REASON_LABEL[r]} />
              </label>
            ))}
            <p className="hint">
              <T k="online.report.note" />
            </p>
            <button
              type="button"
              className={buttonClass('danger', { block: true })}
              data-id="online-menu-report-send"
              disabled={reason === null}
              onClick={() => reason && social.send({ type: 'report', id: player.id, reason })}
            >
              <T k="online.report.send" />
            </button>
          </fieldset>
        ) : null}
        {step === 'actions' ? null : (
          <button type="button" className={buttonClass('ghost', { block: true })} data-id="online-menu-back" onClick={() => setStep('actions')}>
            <T k="common.back" />
          </button>
        )}
      </div>
    </Modal>
  );
}
