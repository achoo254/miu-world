import { MeResponse, ParentDto } from '@miu/schema/account';
import type { Db } from '../db/client';
import { PIN_MAX_FAILS, isParentGateOpen, type AuthContext } from './auth-context';
import { hasCurrentConsent } from './consent-store';

/** Everything the web app needs to route the parent: consent, active child, gate and PIN state. */
export async function accountSummary(db: Db, ctx: AuthContext, now: Date, policyVersion: string): Promise<MeResponse> {
  return MeResponse.parse({
    parent: ParentDto.parse(ctx.parent),
    consentAccepted: await hasCurrentConsent(db, ctx.parent.id, policyVersion),
    activeChildId: ctx.session.activeChildId,
    parentGateOpen: isParentGateOpen(ctx, now),
    pinLocked: ctx.parent.pinFailedCount >= PIN_MAX_FAILS,
    pinSet: ctx.parent.pinHash !== null,
  });
}
