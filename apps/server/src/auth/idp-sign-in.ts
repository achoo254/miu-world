// The part of a sign-in through the account service the web and the app share, once the IdP's ID token is checked:
// the re-authentication rule, which account the identity is (idp-account-link.ts), and the new Miu session.
//
// Signing in does NOT open the parent area once a PIN exists: a child on a device where the parent is still signed in
// at the IdP could otherwise skip the PIN. Only a proven re-authentication clears a PIN lock-out and opens the area:
// the ID token says a provider asked for the credentials again (`amr` "reauth"; the IdP only grants it to Google with
// prompt=login + max_age=0 and to Apple, never GitHub) and its `auth_time` is within REAUTH_MAX_AGE_S. Asking for one
// (`prompt=login`, `max_age=0`) is the client's part; whether it happened is read from the token alone, never from what
// the app says.
import { eq } from 'drizzle-orm';
import type { Response } from 'express';
import type { Db } from '../db/client';
import { parents, type SessionKind } from '../db/schema';
import { accountForIdentity } from './idp-account-link';
import type { IdpIdentity } from './idp-client';
import type { createSignIn, SignedIn } from './sign-in';

/** A re-authentication must have happened at the IdP within this window. */
export const REAUTH_MAX_AGE_S = 5 * 60;

/** Why a sign-in did not finish; the web shows it on /login?error=…, the app as the API error. */
export type IdpSignInFailure = 'idp' | 'idp-reauth' | 'idp-email-unverified' | 'idp-conflict' | 'idp-google-mismatch';

/** Whether the ID token proves a fresh re-authentication at a provider that asked again. */
export function provesReauth(identity: Pick<IdpIdentity, 'amr' | 'authTime'>, now: Date): boolean {
  const nowS = Math.floor(now.getTime() / 1000);
  return identity.amr.includes('reauth') && identity.authTime !== null && identity.authTime <= nowS + 60 && nowS - identity.authTime <= REAUTH_MAX_AGE_S;
}

const FAILURE_OF = { 'email-unverified': 'idp-email-unverified', conflict: 'idp-conflict', 'google-mismatch': 'idp-google-mismatch' } as const;

export interface IdpSignInDeps {
  db: Db;
  issuer: string;
  clock: () => Date;
  signIn: ReturnType<typeof createSignIn>;
}

export async function signInWithIdentity(
  { db, issuer, clock, signIn }: IdpSignInDeps,
  res: Response,
  identity: IdpIdentity | null,
  options: { reauth: boolean; kind: SessionKind },
): Promise<{ ok: true; signedIn: SignedIn } | { ok: false; code: IdpSignInFailure }> {
  if (!identity) return { ok: false, code: 'idp' };
  const freshReauth = provesReauth(identity, clock());
  // A re-authentication was asked for (the web's own cookie, or the app) and the token does not prove it.
  if (options.reauth && !freshReauth) return { ok: false, code: 'idp-reauth' };
  const account = await accountForIdentity(db, issuer, identity, clock());
  if (!account.ok) return { ok: false, code: FAILURE_OF[account.reason] };
  const [owner] = await db.select({ pinHash: parents.pinHash }).from(parents).where(eq(parents.id, account.parentId));
  const signedIn = await signIn(res, account.parentId, {
    // The parent area opens only to set the first PIN, or after a real re-authentication.
    openParentGate: owner?.pinHash === null || freshReauth,
    clearPinLock: freshReauth,
    kind: options.kind,
    idpSid: options.kind === 'web' ? identity.sid : null,
  });
  return { ok: true, signedIn };
}
