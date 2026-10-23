// The app's session, app build only (loaded with `import()` behind NATIVE_APP, so the web bundle never has it): the
// token lives in the Keychain (iOS, this device only) or the Keystore (Android) through
// @aparajita/capacitor-secure-storage, never in the WebView's storage, and in memory for this run (session-token.ts).
// One entry per server, so a build pointed at another server never reads this one's token.
import { KeychainAccess, SecureStorage } from '@aparajita/capacitor-secure-storage';
import { SystemAuth } from '@shared-next/capacitor-system-auth';
import { z } from 'zod';
import { api } from '../ui/api-client';
import { SERVER_ORIGIN } from './endpoints';
import { signInNative } from './native-sign-in';
import { setSessionToken } from './session-token';

const KEY = `miu-session:${URL.parse(SERVER_ORIGIN)?.host ?? 'unknown'}`;

/** Reads the stored token once at start; a store that fails reads as signed out. */
export async function loadNativeSession(): Promise<void> {
  try {
    const stored = await SecureStorage.get(KEY, false, false);
    setSessionToken(typeof stored === 'string' ? stored : '');
  } catch {
    console.warn('secure storage unavailable');
    setSessionToken('');
  }
}

async function saveToken(token: string): Promise<void> {
  await SecureStorage.set(KEY, token, false, false, KeychainAccess.whenUnlockedThisDeviceOnly);
  setSessionToken(token);
}

/** Forgets the token (signed out, or the server no longer knows it). */
export async function clearNativeSession(): Promise<void> {
  setSessionToken('');
  try {
    await SecureStorage.remove(KEY, false);
  } catch {
    console.warn('secure storage unavailable');
  }
}

/** Signs in through the system browser; false when the person closed it. `reauth` clears a PIN lock-out. */
export function startNativeSignIn(reauth: boolean): Promise<boolean> {
  return signInNative(
    {
      config: () => api('GET', '/auth/native/config', z.unknown()),
      authenticate: async (url, scheme) => (await SystemAuth.authenticate({ url, callback: { scheme } })).url,
      // The current token goes along (api-client), so the server ends this device's previous session.
      exchange: (body) => api('POST', '/auth/native/exchange', z.unknown(), body),
      saveToken,
    },
    { reauth },
  );
}
