// NEW SCREEN part (Master Plan §6, account area, progress view): "Chia sẻ tuần này" opens a small dialog with the
// card of the week (minutes played, lessons done) drawn in the browser, to send on by the phone's share sheet or to
// save as a picture. The card holds no name and no id, and nothing of it is kept on the server or in a public page.
import { useEffect, useMemo, useState } from 'react';
import type { PlayerProgressDto } from '@miu/schema/progress';
import { pairOf } from '../i18n/i18n';
import { T, useT } from '../i18n/use-t';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { canShareFile, copyText, shareImage } from '../share/share-actions';
import { weeklyLink } from '../share/share-links';
import { renderWeeklyCard, type WeeklyCardFacts } from './weekly-card';
import './weekly-share.css';

type Notice = 'shared' | 'downloaded' | 'downloadedLink' | 'failed';
const NOTICE_TEXT = { shared: 'weeklyShare.shared', downloaded: 'weeklyShare.downloaded', downloadedLink: 'weeklyShare.downloadedLink', failed: 'weeklyShare.failed' } as const;

/** What the card says, from the progress view: the current week is its last. */
export const weeklyFacts = (progress: PlayerProgressDto): WeeklyCardFacts => ({
  minutes: progress.weeks.at(-1)?.minutes ?? 0,
  lessonsDone: progress.counts.lessonsDone,
  lessonsTotal: progress.counts.lessonsTotal,
});

function WeeklyCardDialog({ facts, onClose }: { facts: WeeklyCardFacts; onClose: () => void }) {
  const { t } = useT();
  const [card, setCard] = useState<{ file: File; url: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const { minutes, lessonsDone, lessonsTotal } = facts;
  // The facts are three numbers: a new object each render must not draw the card again.
  const key = useMemo(() => ({ minutes, lessonsDone, lessonsTotal }), [minutes, lessonsDone, lessonsTotal]);

  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    renderWeeklyCard(key).then(
      (blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setCard({ file: new File([blob], 'miu-world-tuan-nay.png', { type: 'image/png' }), url });
      },
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [key]);

  const send = async (file: File): Promise<void> => {
    setBusy(true);
    setNotice(null);
    const link = weeklyLink(window.location.origin);
    const outcome = await shareImage(file, `${pairOf('weeklyShare.shareText').vi} ${link}`, { contentType: 'weekly' });
    if (outcome === 'web-share') setNotice('shared');
    // A saved picture has no link with it: the link is copied so it can be pasted next to the picture.
    else if (outcome === 'download') setNotice((await copyText(link)) ? 'downloadedLink' : 'downloaded');
    else if (outcome === 'failed') setNotice('failed');
    setBusy(false);
  };

  return (
    <Modal title={<T k="weeklyShare.title" />} onClose={onClose} dataId="weekly-share">
      {card ? (
        <img className="weekly-share-card" src={card.url} alt={t('weeklyShare.imageAlt', { minutes, done: lessonsDone, total: lessonsTotal })} width={1080} height={1080} data-id="weekly-share-card" />
      ) : failed ? (
        <p role="alert" className="error">
          <T k="weeklyShare.failed" />
        </p>
      ) : (
        <p role="status" className="weekly-share-wait">
          <T k="weeklyShare.preparing" />
        </p>
      )}
      <p className="hint">
        <T k="weeklyShare.note" />
      </p>
      {notice ? (
        <p role="status" className={notice === 'failed' ? 'error' : 'hint'} data-id="weekly-share-notice">
          <T k={NOTICE_TEXT[notice]} />
        </p>
      ) : null}
      <div className="modal-actions">
        {card ? (
          <button type="button" className={buttonClass('primary', { block: true })} data-id="weekly-share-send" disabled={busy} onClick={() => void send(card.file)}>
            <T k={canShareFile(card.file) ? 'weeklyShare.share' : 'weeklyShare.download'} />
          </button>
        ) : null}
        <button type="button" className={buttonClass('ghost', { block: true })} data-id="weekly-share-close" onClick={onClose}>
          <T k="common.close" />
        </button>
      </div>
    </Modal>
  );
}

/** The button of the progress view that opens the card of this week. */
export function WeeklyShare({ progress }: { progress: PlayerProgressDto }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={`${buttonClass('secondary', { small: true })} weekly-share-open`} data-id="weekly-share-open" onClick={() => setOpen(true)}>
        <span aria-hidden="true">📣</span> <T k="weeklyShare.button" />
      </button>
      {open ? <WeeklyCardDialog facts={weeklyFacts(progress)} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
