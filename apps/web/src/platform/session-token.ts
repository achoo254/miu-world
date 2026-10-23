// The iPhone/Android app's Miu session token for the requests of this run: read from the Keychain/Keystore at start
// (native-session-store.ts, app build only) and sent as `Authorization: Bearer` on every API call. The web never has
// one: its session is the server's httpOnly cookie, so on the web this adds no header at all.
let current = '';

/** The token of this run; '' when signed out (always on the web). */
export function sessionToken(): string {
  return current;
}

export function setSessionToken(token: string): void {
  current = token;
}

/** The header that signs an API call in as the app's session; none without a token. */
export function authHeaders(): Record<string, string> {
  return current === '' ? {} : { Authorization: `Bearer ${current}` };
}
