import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { consents } from '../db/schema';

/** Whether the parent accepted this exact policy version (a new version needs a new consent). */
export async function hasCurrentConsent(db: Db, parentId: string, policyVersion: string): Promise<boolean> {
  const rows = await db
    .select({ id: consents.id })
    .from(consents)
    .where(and(eq(consents.parentId, parentId), eq(consents.policyVersion, policyVersion)))
    .limit(1);
  return rows.length > 0;
}
