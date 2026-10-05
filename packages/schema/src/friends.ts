// Friends, like in any online game (owner, 05/10/2026): no codes. A player asks another player she meets in a
// room (or a companion bot); the one asked accepts or not, no parent in between. Friends with a companion bot
// are allowed and the bot is always labelled. What the API says about another player is what everyone in a room
// already sees: her character's name and species, never an account, a profile id, an email or anything real.
import { z } from 'zod';
import { ContentId } from './content';

/** Friends a player can have. */
export const FRIENDS_MAX = 50;
/** Requests a player can have waiting for others' answers at once. */
export const FRIEND_PENDING_MAX = 20;

const RowId = z.uuid();
const Instant = z.iso.datetime({ offset: true });

/** Another player (or a companion bot) as a list shows her. */
export const FriendPerson = z.strictObject({
  displayName: z.string().min(1).max(32),
  species: z.string().min(1).max(32),
  /** A companion bot: always shown with its label. */
  isBot: z.boolean(),
});
export type FriendPerson = z.infer<typeof FriendPerson>;

export const FriendDto = FriendPerson.extend({
  /** This friendship (to remove it); not the friend's id. */
  id: RowId,
  since: Instant,
  /** In a room now (a companion bot: while the bots run). */
  online: z.boolean(),
  /** Her id in the rooms while online (to go to her), null otherwise. */
  publicId: z.string().min(1).max(40).nullable(),
  /** The map she is on while online. */
  mapId: ContentId.nullable(),
});
export type FriendDto = z.infer<typeof FriendDto>;

export const FriendRequestDto = FriendPerson.extend({ id: RowId, sentAt: Instant });
export type FriendRequestDto = z.infer<typeof FriendRequestDto>;

/** A player she blocked (to lift it). */
export const BlockDto = z.strictObject({ id: RowId, displayName: z.string().min(1).max(32), species: z.string().min(1).max(32), since: Instant });
export type BlockDto = z.infer<typeof BlockDto>;

/** A player's friends, the requests for her and from her, and whom she blocked. */
export const SocialView = z.strictObject({
  friends: z.array(FriendDto),
  incoming: z.array(FriendRequestDto),
  outgoing: z.array(FriendRequestDto),
  blocks: z.array(BlockDto),
  max: z.number().int().positive(),
});
export type SocialView = z.infer<typeof SocialView>;

export const FriendAnswer = z.strictObject({ accept: z.boolean() });
export type FriendAnswer = z.infer<typeof FriendAnswer>;
