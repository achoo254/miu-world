// Which Miu account an account-service identity signs into. An identity already linked signs into its account. A
// new one is linked to the account with the IdP's verified email (how the parents of the former direct Google sign-in
// carry over), or gets a new, empty account when no account has that email. Never on an unverified email, and never
// onto an account already linked to another identity: one identity per account, one account per identity
// (`parent_idp_links`). An account of the former Google sign-in (`google_sub` set) is only linked when this sign-in
// went through Google at the IdP (`amr` "google") with that very Google account (the IdP's `google_sub`): anyone else
// with the email is refused and told to ask support, who relinks by hand (docs/deployment-guide.md §5.1). When no
// account has the email, the same Google account still finds its former parent (the email changed at Google).
//
// The app-review sign-in of the account service (auth-next ADR 0010: a password account for store reviewers, only
// while the IdP has it switched on, its email unverified, `amr` "review") gets an account of its own, keyed by issuer
// and `sub` alone: never matched by email or Google account, and its stored email is a made-up `.invalid` address
// derived from the identity, so it cannot collide with a real parent's or match an email-based list (moderators).
// Nothing on Miu's side turns it on or off: the IdP issuing such tokens is the switch.
import { createHash, randomUUID } from 'node:crypto';
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

/** The method the account service names its app-review password sign-in with in `amr`. */
export const REVIEW_SIGN_IN = 'review';

/** The stored email of a review account: unique per identity, in the reserved `.invalid` domain, never a real inbox. */
export const reviewAccountEmail = (issuer: string, sub: string): string =>
  `app-review-${createHash('sha256').update(`${issuer}\n${sub}`).digest('hex').slice(0, 32)}@review.invalid`;

/** A review identity's own new account (its link is checked first by the caller). */
async function createReviewAccount(db: Db, issuer: string, sub: string, now: Date): Promise<AccountLink> {
  try {
    return await db.transaction(async (tx): Promise<AccountLink> => {
      const parentId = randomUUID();
      await tx.insert(parents).values({ id: parentId, email: reviewAccountEmail(issuer, sub) });
      await tx.insert(parentIdpLinks).values({ parentId, issuer, subject: sub, linkedAt: now });
      console.info('app review account registered', parentId);
      return { ok: true, parentId, outcome: 'created' };
    });
  } catch (err) {
    const raced = await linkedParent(db, issuer, sub);
    if (raced) return { ok: true, parentId: raced, outcome: 'signed-in' };
    console.warn('app review account failed', pgCode(err));
    return { ok: false, reason: 'conflict' };
  }
}

export async function accountForIdentity(db: Db, issuer: string, identity: IdpIdentity, now: Date): Promise<AccountLink> {
  const known = await linkedParent(db, issuer, identity.sub);
  if (known) return { ok: true, parentId: known, outcome: 'signed-in' };
  if (identity.amr.includes(REVIEW_SIGN_IN)) return createReviewAccount(db, issuer, identity.sub, now);
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
      // The email changed at Google since the former Google sign-in: the same Google account finds its parent.
      const byGoogle = identity.amr.includes('google') && identity.googleSub ? (await tx.select().from(parents).where(eq(parents.googleSub, identity.googleSub)).for('update'))[0] : undefined;
      if (byGoogle) {
        const [taken] = await tx.select({ parentId: parentIdpLinks.parentId }).from(parentIdpLinks).where(eq(parentIdpLinks.parentId, byGoogle.id));
        if (taken) return { ok: false, reason: 'conflict' };
        await tx.insert(parentIdpLinks).values({ parentId: byGoogle.id, issuer, subject: identity.sub, linkedAt: now });
        console.info('parent linked to the account service by its Google account', byGoogle.id);
        return { ok: true, parentId: byGoogle.id, outcome: 'linked' };
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
