import { asc, eq } from 'drizzle-orm';
import { MeResponse, ParentDto } from '@miu/schema/account';
import type { Db } from '../db/client';
import { childProfiles } from '../db/schema';
import { PIN_MAX_FAILS, isParentGateOpen, type AuthContext } from './auth-context';
import { hasCurrentConsent } from './consent-store';

/** Everything the web app needs to route the account: consent, players, active player, gate and PIN state. */
export async function accountSummary(db: Db, ctx: AuthContext, now: Date, policyVersion: string): Promise<MeResponse> {
  return MeResponse.parse({
    parent: ParentDto.parse(ctx.parent),
    consentAccepted: await hasCurrentConsent(db, ctx.parent.id, policyVersion),
    activePlayerId: ctx.session.activeChildId,
    players: await db
      .select({ id: childProfiles.id, displayName: childProfiles.displayName, primary: childProfiles.isPrimary })
      .from(childProfiles)
      .where(eq(childProfiles.parentId, ctx.parent.id))
      .orderBy(asc(childProfiles.createdAt), asc(childProfiles.id))
      .then((rows) => [...rows].sort((a, b) => Number(b.primary) - Number(a.primary))),
    parentGateOpen: isParentGateOpen(ctx, now),
    pinLocked: ctx.parent.pinFailedCount >= PIN_MAX_FAILS,
    pinSet: ctx.parent.pinHash !== null,
  });
}
