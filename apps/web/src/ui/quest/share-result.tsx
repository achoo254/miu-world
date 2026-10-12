// NEW SCREEN part (Master Plan §6, after a quest): on the reward screen, under the stars, a quiet second button to show
// the result off. What goes out is the link of the lesson's public page (the home page for a quest with no lesson),
// never a name or a number of hers; "kèm lời mời" adds a fresh invite link's code to it, so whoever opens it and signs
// in becomes her friend. Copying into the vở stays the screen's first job: this button comes after it and does not
// take its place.
import { useState } from 'react';
import type { QuestTextbook } from '@miu/schema/game';
import { errorMessage } from '../api-client';
import { createInvite, revokeInvite } from '../friends/invite-api';
import { pairOf } from '../i18n/i18n';
import { T } from '../i18n/use-t';
import { buttonClass } from '../kit/button';
import { shareLink } from '../share/share-actions';
import { lessonPageOf } from '../share/lesson-link';
import { resultLink } from '../share/share-links';

type Notice = 'shared' | 'copied' | 'failed';
const NOTICE_TEXT = { shared: 'shareResult.shared', copied: 'shareResult.copied', failed: 'shareResult.failed' } as const;

export function ShareResult({ textbook }: { textbook: QuestTextbook | undefined }) {
  const page = lessonPageOf(textbook);
  const [withInvite, setWithInvite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState<string | null>(null);

  const share = async (): Promise<void> => {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const invite = withInvite ? await createInvite() : null;
      const outcome = await shareLink(
        { title: pairOf('shareResult.title').vi, text: pairOf('shareResult.text').vi, url: resultLink(window.location.origin, page?.slug ?? null, invite?.code) },
        { contentType: 'result', ...(page ? { lessonId: page.lessonId } : {}) },
      );
      // A link nobody got must not keep one of her few live invites.
      if (invite && (outcome === 'cancelled' || outcome === 'failed')) await revokeInvite(invite.id).catch(() => undefined);
      if (outcome === 'web-share') setNotice('shared');
      else if (outcome === 'copy-link') setNotice('copied');
      else if (outcome === 'failed') setNotice('failed');
    } catch (err) {
      setError(errorMessage(err));
    }
    setBusy(false);
  };

  return (
    <div className="share-result" data-id="share-result">
      <label className="share-result-invite">
        <input type="checkbox" checked={withInvite} disabled={busy} onChange={(e) => setWithInvite(e.target.checked)} data-id="share-result-invite" />
        <T k="shareResult.withInvite" />
      </label>
      <button type="button" className={buttonClass('secondary', { small: true })} data-id="share-result-button" disabled={busy} onClick={() => void share()}>
        <span aria-hidden="true">📣</span> <T k="shareResult.button" />
      </button>
      {notice ? (
        <p role="status" className="hint" data-id="share-result-notice">
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
