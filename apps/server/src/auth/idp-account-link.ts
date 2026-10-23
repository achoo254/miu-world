// Which Miu account an account-service identity signs into. An identity already linked signs into its account. A
// new one is linked to the account with the IdP's verified email (how the parents of the former direct Google sign-in
// carry over), or gets a new, empty account when no account has that email. Never on an unverified email, and never
// onto an account already linked to another identity: one identity per account, one account per identity
// (`parent_idp_links`). An account of the former Google sign-in (`google_sub` set) is only linked when this sign-in
// went through Google at the IdP (`amr` "google") with that very Google account (the IdP's `google_sub`): anyone else
// with the email is refused and told to ask support, who relinks by hand (docs/deployment-guide.md §5.1).
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { parentIdpLinks, parents, sessions } from '../db/schema';
import type { IdpIdentity } from './idp-client';

export type AccountLink =
  | { ok: true; parentId: string; outcome: 'signed-in' | 'linked' | 'created' }
  | { ok: false; reason: 'email-unverified' | 'conflict' | 'google-mismatch' };

async function linkedParent(db: Db, issuer: string, sub: string): Promise<string | null> {
  const [link] = await db
    .select({ parentId: parentIdpLinks.parentId })
    .from(parentIdpLinks)
    .where(and(eq(parentIdpLinks.issuer, issuer), eq(parentIdpLinks.subject, sub)));
  return link?.parentId ?? null;
}

/** Whether this sign-in is the Google account a former-Google parent signed in with. */
const sameGoogleAccount = (identity: IdpIdentity, googleSub: string): boolean => identity.amr.includes('google') && identity.googleSub === googleSub;

/** The Postgres error code of a failed write (unique violation 23505…), for the log; never the message (it holds values). */
const pgCode = (err: unknown): string => (typeof err === 'object' && err !== null && 'code' in err && typeof err.code === 'string' ? err.code : 'unknown');

export async function accountForIdentity(db: Db, issuer: string, identity: IdpIdentity, now: Date): Promise<AccountLink> {
  const known = await linkedParent(db, issuer, identity.sub);
  if (known) return { ok: true, parentId: known, outcome: 'signed-in' };
  if (!identity.emailVerified || identity.email === '') return { ok: false, reason: 'email-unverified' };
  try {
    return await db.transaction(async (tx): Promise<AccountLink> => {
      const [byEmail] = await tx.select().from(parents).where(eq(parents.email, identity.email)).for('update');
      if (byEmail) {
        const [taken] = await tx.select().from(parentIdpLinks).where(eq(parentIdpLinks.parentId, byEmail.id));
        // A concurrent first sign-in of this same identity linked it a moment ago.
        if (taken) return taken.issuer === issuer && taken.subject === identity.sub ? { ok: true, parentId: byEmail.id, outcome: 'signed-in' } : { ok: false, reason: 'conflict' };
        if (byEmail.googleSub !== null && !sameGoogleAccount(identity, byEmail.googleSub)) return { ok: false, reason: 'google-mismatch' };
        await tx.insert(parentIdpLinks).values({ parentId: byEmail.id, issuer, subject: identity.sub, linkedAt: now });
        if (byEmail.passwordHash !== null) {
          // A dev/test password account: whoever set that password or PIN may not be this person, so both go and every
          // older session is signed out.
          await tx.update(parents).set({ passwordHash: null, pinHash: null, pinFailedCount: 0 }).where(eq(parents.id, byEmail.id));
          await tx.delete(sessions).where(eq(sessions.parentId, byEmail.id));
        }
        console.info('parent linked to the account service', byEmail.id);
        return { ok: true, parentId: byEmail.id, outcome: 'linked' };
      }
      const parentId = randomUUID();
      await tx.insert(parents).values({ id: parentId, email: identity.email });
      await tx.insert(parentIdpLinks).values({ parentId, issuer, subject: identity.sub, linkedAt: now });
      console.info('parent registered', parentId);
      return { ok: true, parentId, outcome: 'created' };
    });
  } catch (err) {
    // A concurrent sign-in of the same new identity won the insert (unique link or email): use what it made.
    const raced = await linkedParent(db, issuer, identity.sub);
    if (raced) return { ok: true, parentId: raced, outcome: 'signed-in' };
    console.warn('account link failed', pgCode(err));
    return { ok: false, reason: 'conflict' };
  }
}
