import { useState, type FormEvent } from 'react';
import { ApiError, errorMessage } from '../api-client';
import { useAccount } from './account-context';

/** Server answers that mean our cached account state is stale (gate expired, session gone). */
const STALE_STATE_CODES = new Set(['parent-gate-closed', 'unauthenticated', 'no-active-child', 'pin-locked', 'consent-required']);

/** Form submit wrapper: busy flag, friendly error message, and a state refresh when the server says it moved on. */
export function useSubmit(action: () => Promise<void>) {
  const { refresh } = useAccount();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const onSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiError && STALE_STATE_CODES.has(err.code)) await refresh();
    } finally {
      setBusy(false);
    }
  };
  return { error, busy, onSubmit };
}
