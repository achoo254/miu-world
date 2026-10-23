// The account owner's switches for a player (account management): online play and voice chat. Every route that lets
// a player meet, befriend or talk to others checks them here, so a switch turned off holds on every path, not only
// the multiplayer connection.
import { eq } from 'drizzle-orm';
import type { PlayerControls } from '@miu/schema/account';
import type { Db } from '../db/client';
import { childProfiles } from '../db/schema';
import { HttpError } from '../http-error';

/** The switches of `childId`; a player that is not there has nothing allowed. */
export async function playerControls(db: Db, childId: string): Promise<PlayerControls> {
  const [row] = await db
    .select({ voiceChatAllowed: childProfiles.voiceChatAllowed, onlineAllowed: childProfiles.onlineAllowed })
    .from(childProfiles)
    .where(eq(childProfiles.id, childId));
  return row ?? { voiceChatAllowed: false, onlineAllowed: false };
}

/** 403 `online-off` unless the account owner lets `childId` play online. */
export async function requireOnlineAllowed(db: Db, childId: string): Promise<void> {
  if (!(await playerControls(db, childId)).onlineAllowed) throw new HttpError(403, 'online-off');
}

/** 403 `voice-off` unless the account owner lets `childId` talk by voice. */
export async function requireVoiceAllowed(db: Db, childId: string): Promise<void> {
  if (!(await playerControls(db, childId)).voiceChatAllowed) throw new HttpError(403, 'voice-off');
}
