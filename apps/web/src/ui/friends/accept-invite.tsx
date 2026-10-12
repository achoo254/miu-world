// NEW SCREEN (Master Plan §6, Tài khoản): what the game says once a visitor who came by an invite link is in (signed
// in, policy accepted, character made): the link is used, and the two become friends. One small dialog with the result;
// a link that does not work for any reason says so in one line (the server does not tell which).
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useNavigate } from 'react-router';
import type { InviteAcceptedDto } from '@miu/schema/invites';
import { ApiError } from '../api-client';
import { same } from '../i18n/i18n';
import { T } from '../i18n/use-t';
import { buttonClass } from '../kit/button';
import { Modal } from '../kit/modal';
import { acceptInvite } from './invite-api';

/** An invite link taken from the saved destination, and the quest saved with it (opened when she goes on). */
export interface HeldInvite {
  code: string;
  next?: string;
}

let held: HeldInvite | null = null;
const listeners = new Set<() => void>();

/**
 * Keeps the invite being shown, outside any one screen: it is taken from storage once, on the way to Home, and must
 * stay up whichever screen is mounted at that moment (none: it is dropped).
 */
export function holdInvite(invite: HeldInvite | null): void {
  held = invite;
  for (const listener of [...listeners]) listener();
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useHeldInvite = (): HeldInvite | null => useSyncExternalStore(subscribe, () => held);

type Result = { kind: 'working' } | { kind: 'done'; accepted: InviteAcceptedDto } | { kind: 'not-found' } | { kind: 'friends-full' } | { kind: 'failed' };

export function AcceptInvite({ code, onClose }: { code: string; onClose: () => void }) {
  const navigate = useNavigate();
  const [result, setResult] = useState<Result>({ kind: 'working' });
  useEffect(() => {
    let alive = true;
    acceptInvite(code).then(
      (accepted) => alive && setResult({ kind: 'done', accepted }),
      (err: unknown) => {
        if (!alive) return;
        if (err instanceof ApiError && err.status === 404) setResult({ kind: 'not-found' });
        else if (err instanceof ApiError && err.code === 'friends-full') setResult({ kind: 'friends-full' });
        else setResult({ kind: 'failed' });
      },
    );
    return () => {
      alive = false;
    };
  }, [code]);
  const working = result.kind === 'working';
  return (
    <Modal title={<T k="inviteResult.title" />} onClose={working ? undefined : onClose} dataId="invite-result">
      <p role="status" data-id={`invite-result-${result.kind}`}>
        {result.kind === 'working' ? <T k="inviteResult.working" /> : null}
        {result.kind === 'done' ? <T k={result.accepted.already ? 'inviteResult.already' : 'inviteResult.done'} params={{ who: same(result.accepted.friend.displayName) }} /> : null}
        {result.kind === 'not-found' ? <T k="inviteResult.notFound" /> : null}
        {result.kind === 'friends-full' ? <T k="errors.friendsFull" /> : null}
        {result.kind === 'failed' ? <T k="inviteResult.failed" /> : null}
      </p>
      {working ? null : (
        <div className="modal-actions">
          {result.kind === 'done' ? (
            <button type="button" className={buttonClass('primary', { block: true })} data-id="invite-result-friends" onClick={() => navigate('/friends')}>
              <T k="inviteResult.friends" />
            </button>
          ) : null}
          <button type="button" className={buttonClass(result.kind === 'done' ? 'secondary' : 'primary', { block: true })} data-id="invite-result-continue" onClick={onClose}>
            <T k="inviteResult.continue" />
          </button>
        </div>
      )}
    </Modal>
  );
}
