import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { MeResponse } from '@miu/schema/account';
import { ApiError, api } from '../api-client';

type AccountState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'error' }
  | { status: 'signed-in'; me: MeResponse };

interface AccountApi {
  state: AccountState;
  /** Re-reads `/auth/me` (after select, consent, unlock…). */
  refresh(): Promise<void>;
  /** Adopts a fresh `MeResponse` returned by a mutating call. */
  setMe(me: MeResponse): void;
  signOut(): void;
}

const AccountContext = createContext<AccountApi | null>(null);

async function loadAccount(): Promise<AccountState> {
  try {
    return { status: 'signed-in', me: await api('GET', '/auth/me', MeResponse) };
  } catch (err) {
    return err instanceof ApiError && err.status === 401 ? { status: 'signed-out' } : { status: 'error' };
  }
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccountState>({ status: 'loading' });

  const refresh = useCallback(async () => setState(await loadAccount()), []);

  useEffect(() => {
    let live = true;
    void loadAccount().then((next) => {
      if (live) setState(next);
    });
    return () => {
      live = false;
    };
  }, []);

  const value = useMemo<AccountApi>(
    () => ({
      state,
      refresh,
      setMe: (me) => setState({ status: 'signed-in', me }),
      signOut: () => setState({ status: 'signed-out' }),
    }),
    [state, refresh],
  );
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

/** The account when rendered inside the provider; null in isolated component renders. */
export function useOptionalAccount(): AccountApi | null {
  return useContext(AccountContext);
}

export function useAccount(): AccountApi {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount outside AccountProvider');
  return ctx;
}
