// Parent sign-in in the iPhone/Android app (RFC 8252): Code + PKCE with the account service's public `miu-mobile`
// client in the system browser (ASWebAuthenticationSession / Custom Tabs through @shared-next/capacitor-system-auth),
// never in this WebView. The app asks Miu's server for the IdP parameters, makes and keeps the PKCE verifier, `state`
// and `nonce`, checks the callback, and hands code, verifier and nonce to the server, which answers with the app's
// Miu session token. IdP tokens never reach the app. Pure helpers here; the plugins are injected (see `deps`).
import { NativeAuthConfig, NativeSessionResponse } from '@miu/schema/account';

export interface NativeSignInDeps {
  /** The server's sign-in parameters (`GET /api/auth/native/config`). */
  readonly config: () => Promise<unknown>;
  /** Opens `url` in the system browser and resolves with the callback URL (SystemAuth.authenticate). */
  readonly authenticate: (url: string, scheme: string) => Promise<string>;
  /** Redeems the code (`POST /api/auth/native/exchange`); resolves with the server's answer. */
  readonly exchange: (body: { code: string; codeVerifier: string; redirectUri: string; nonce: string; reauth: boolean }) => Promise<unknown>;
  /** Keeps the new session token (Keychain/Keystore and this run). */
  readonly saveToken: (token: string) => Promise<void>;
  /** Fills `bytes` with random values; crypto.getRandomValues by default. */
  readonly random?: (bytes: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer>;
}

/** A sign-in that did not finish for another reason than the person closing the browser. */
export class NativeSignInError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NativeSignInError';
  }
}

export function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A PKCE verifier (RFC 7636 §4.1: 43 characters from 32 random bytes) and its S256 challenge. */
export async function pkcePair(random: (bytes: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer>): Promise<{ verifier: string; challenge: string }> {
  const verifier = base64Url(random(new Uint8Array(32)));
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: base64Url(new Uint8Array(digest)) };
}

/** The scheme of a private-use redirect URI: com.hoandat.miu of com.hoandat.miu:/auth/callback. */
export function redirectScheme(redirectUri: string): string {
  const colon = redirectUri.indexOf(':');
  if (colon <= 0) throw new NativeSignInError('invalid redirect URI');
  return redirectUri.slice(0, colon);
}

/** The authorization request, as the web's server builds it for /api/auth/start. */
export function authorizationUrl(config: NativeAuthConfig, request: { state: string; nonce: string; challenge: string; reauth: boolean }): string {
  const url = new URL(config.authorizationEndpoint);
  const q = url.searchParams;
  q.set('client_id', config.clientId);
  q.set('redirect_uri', config.redirectUri);
  q.set('response_type', 'code');
  q.set('scope', config.scope);
  q.set('state', request.state);
  q.set('nonce', request.nonce);
  q.set('code_challenge', request.challenge);
  q.set('code_challenge_method', 'S256');
  // Clearing a PIN lock-out: the IdP must sign the person in again (the server checks auth_time).
  if (request.reauth) {
    q.set('prompt', 'login');
    q.set('max_age', '0');
  }
  return url.toString();
}

/**
 * The code of the callback URL. Only a callback of this sign-in counts: its redirect URI and state must match (a URL
 * another app opened with the scheme is refused), and an IdP error ends the sign-in.
 */
export function callbackCode(callbackUrl: string, redirectUri: string, state: string): string {
  const url = URL.parse(callbackUrl);
  const expected = URL.parse(redirectUri);
  if (!url || !expected) throw new NativeSignInError('callback: not a URL');
  if (url.protocol !== expected.protocol || url.pathname !== expected.pathname) throw new NativeSignInError('callback: another redirect URI');
  if (url.searchParams.get('state') !== state) throw new NativeSignInError('callback: state mismatch');
  if (url.searchParams.has('error')) throw new NativeSignInError('callback: the IdP refused');
  const code = url.searchParams.get('code') ?? '';
  if (code === '') throw new NativeSignInError('callback: no code');
  return code;
}

/** Whether the system-auth plugin reported that the person closed the browser. */
export function isCancelled(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === 'CANCELLED';
}

/** Runs the whole sign-in and keeps the new token. Resolves false when the person closed the browser. */
export async function signInNative(deps: NativeSignInDeps, options: { reauth: boolean }): Promise<boolean> {
  const random =
    deps.random ??
    ((bytes: Uint8Array<ArrayBuffer>) => {
      crypto.getRandomValues(bytes);
      return bytes;
    });
  const parsed = NativeAuthConfig.safeParse(await deps.config());
  if (!parsed.success) throw new NativeSignInError('incomplete sign-in parameters');
  const config = parsed.data;
  const { verifier, challenge } = await pkcePair(random);
  const state = base64Url(random(new Uint8Array(32)));
  const nonce = base64Url(random(new Uint8Array(16)));
  let callback: string;
  try {
    callback = await deps.authenticate(authorizationUrl(config, { state, nonce, challenge, reauth: options.reauth }), redirectScheme(config.redirectUri));
  } catch (err) {
    if (isCancelled(err)) return false;
    throw new NativeSignInError('the system browser could not finish the sign-in');
  }
  const code = callbackCode(callback, config.redirectUri, state);
  const answer = NativeSessionResponse.safeParse(await deps.exchange({ code, codeVerifier: verifier, redirectUri: config.redirectUri, nonce, reauth: options.reauth }));
  if (!answer.success) throw new NativeSignInError('the server returned no session');
  await deps.saveToken(answer.data.token);
  return true;
}
