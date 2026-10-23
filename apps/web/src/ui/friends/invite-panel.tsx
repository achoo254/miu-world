// NEW SCREEN, a tab of the friends list (after the friends list's own mock, `designs/multiplayer.png` frames 2 and 9):
// bring a friend in by a link. She makes a link (one use, a week, withdrawn any time), sends it by the share sheet or
// copies it, sees the links still live and withdraws one. The link is told once, when it is made: the codes of the
// links made while the list is open are kept by the list (`codes`) so they can be sent again until it closes.
import { useState } from 'react';
import { INVITES_MAX, type InviteDto } from '@miu/schema/invites';
import { errorMessage } from '../api-client';
import { pairOf } from '../i18n/i18n';
import { T, useT } from '../i18n/use-t';
import { buttonClass } from '../kit/button';
import { useLoaded } from '../progression/progression-api';
import { hasShareSheet, shareLink } from '../share/share-actions';
import { webOrigin } from '../../platform/endpoints';
import { inviteLink } from '../share/share-links';
import { createInvite, loadInvites, revokeInvite } from './invite-api';

/** "12/10 13:45", in the player's own time. */
const dayTime = (iso: string): string => new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

type Notice = 'shared' | 'copied' | 'copyFailed';
const NOTICE_TEXT = { shared: 'invite.shared', copied: 'invite.copied', copyFailed: 'invite.copyFailed' } as const;

function LiveInvite({ invite, code, onShare, onRevoke }: { invite: InviteDto; code: string | undefined; onShare: (code: string) => void; onRevoke: () => void }) {
  const { t } = useT();
  return (
    <li className="invite-row" data-id={`invite-${invite.id}`}>
      <span className="invite-when">
        <T k="invite.liveRow" params={{ created: dayTime(invite.createdAt), expires: dayTime(invite.expiresAt) }} />
      </span>
      {code ? (
        <input
          className="invite-link"
          type="text"
          readOnly
          value={inviteLink(webOrigin(), code)}
          aria-label={t('invite.linkLabel')}
          data-id={`invite-link-${invite.id}`}
          onFocus={(e) => e.currentTarget.select()}
        />
      ) : null}
      <span className="friend-actions">
        {code ? (
          <button type="button" className={buttonClass('primary', { small: true })} data-id={`invite-share-${invite.id}`} onClick={() => onShare(code)}>
            <T k={hasShareSheet() ? 'invite.share' : 'invite.copy'} />
          </button>
        ) : null}
        <button type="button" className={buttonClass('ghost', { small: true })} data-id={`invite-revoke-${invite.id}`} onClick={onRevoke}>
          <T k="invite.revoke" />
        </button>
      </span>
    </li>
  );
}

export function InvitePanel({ codes, onCode }: { codes: Readonly<Record<string, string>>; onCode: (id: string, code: string | null) => void }) {
  const { data, failed, retry } = useLoaded(loadInvites);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  /** Runs one action, shows what went wrong, and reads the list again either way. */
  const act = async (run: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await run();
    } catch (err) {
      setError(errorMessage(err));
    }
    setBusy(false);
    retry();
  };

  const share = async (code: string): Promise<void> => {
    const url = inviteLink(webOrigin(), code);
    const outcome = await shareLink({ title: pairOf('invite.shareTitle').vi, text: pairOf('invite.shareText').vi, url }, { contentType: 'invite' });
    if (outcome === 'web-share') setNotice('shared');
    else if (outcome === 'copy-link') setNotice('copied');
    else if (outcome === 'failed') setNotice('copyFailed');
  };

  if (failed) {
    return (
      <div className="row" role="alert">
        <p className="error">
          <T k="invite.loadFailed" />
        </p>
        <button type="button" className={buttonClass('ghost', { small: true })} onClick={retry}>
          <T k="common.retry" />
        </button>
      </div>
    );
  }
  const invites = data?.invites ?? [];
  const max = data?.max ?? INVITES_MAX;
  const full = invites.length >= max;
  return (
    <div className="invite-panel" data-id="friends-invite">
      <p className="hint">
        <T k="invite.intro" />
      </p>
      <button
        type="button"
        className={buttonClass('primary')}
        data-id="invite-create"
        disabled={busy || data === null || full}
        onClick={() =>
          void act(async () => {
            const created = await createInvite();
            onCode(created.id, created.code);
          })
        }
      >
        <T k={busy ? 'invite.creating' : 'invite.create'} />
      </button>
      {full ? (
        <p className="hint" data-id="invite-full">
          <T k="invite.full" params={{ max }} />
        </p>
      ) : null}
      <h3 className="friend-heading">
        <T k="invite.liveTitle" params={{ count: invites.length, max }} />
      </h3>
      {invites.length > 0 ? (
        <ul className="friend-list" data-id="invite-list">
          {invites.map((invite) => (
            <LiveInvite
              key={invite.id}
              invite={invite}
              code={codes[invite.id]}
              onShare={(code) => void share(code)}
              onRevoke={() =>
                void act(async () => {
                  await revokeInvite(invite.id);
                  onCode(invite.id, null);
                })
              }
            />
          ))}
        </ul>
      ) : data ? (
        <p className="hint">
          <T k="invite.none" />
        </p>
      ) : null}
      {invites.some((invite) => !codes[invite.id]) ? (
        <p className="hint">
          <T k="invite.shownOnce" />
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="hint" data-id="invite-notice">
          <T k={NOTICE_TEXT[notice]} />
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
