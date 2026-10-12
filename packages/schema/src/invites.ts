// Invite links (`/moi/<code>`): a player makes one to bring a friend in. The link is one use, good for a week and
// withdrawn by its maker any time; it carries a random code and nothing else (no id, no name), and the server keeps
// only the code's hash. The maker sees her live links by their own row id (to withdraw one), never by the code again.
import { z } from 'zod';

/** Live invites (not used, not withdrawn, not expired) one player can have at once. */
export const INVITES_MAX = 5;
/** How long an invite is good for. */
export const INVITE_TTL_DAYS = 7;
/** An invite code: 128 random bits as base64url (22 characters). */
export const INVITE_CODE = /^[A-Za-z0-9_-]{22}$/;
/** Where an invite link leads, on this site. */
export const INVITE_PAGE_ROOT = '/moi';

/** The address path of an invite link. */
export const invitePath = (code: string): string => `${INVITE_PAGE_ROOT}/${code}`;

const RowId = z.uuid();
const Instant = z.iso.datetime({ offset: true });

/** One of her live invites, as the list shows it (no code: that was shown once, when she made it). */
export const InviteDto = z.strictObject({ id: RowId, createdAt: Instant, expiresAt: Instant });
export type InviteDto = z.infer<typeof InviteDto>;

/** A new invite: the only time the code is told. */
export const CreatedInviteDto = InviteDto.extend({ code: z.string().regex(INVITE_CODE) });
export type CreatedInviteDto = z.infer<typeof CreatedInviteDto>;

export const InviteList = z.strictObject({ invites: z.array(InviteDto), max: z.number().int().positive() });
export type InviteList = z.infer<typeof InviteList>;

/**
 * Who she is now friends with after using a link (a character's name and species, as any friends list shows).
 * `already`: they were friends or she used this same link before; nothing new was made.
 */
export const InviteAcceptedDto = z.strictObject({
  friend: z.strictObject({ displayName: z.string().min(1).max(32), species: z.string().min(1).max(32) }),
  already: z.boolean(),
});
export type InviteAcceptedDto = z.infer<typeof InviteAcceptedDto>;
