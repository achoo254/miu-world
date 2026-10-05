// Any quest played as a party (owner, 05/10/2026: every quest and boss can be played together). The leader picks
// the quest; each member joins (or not) and plays it on her own screen with her own progress, paid by the server
// for her own run. Exploring is shared (one member talking, finding or reading moves everyone on), every question is
// answered by each member and the party goes on once all have, and a boss is a team boss with one HP, its turns
// taken in order. These messages carry who plays, who the party waits for, and whose turn a boss blow is.
import { z } from 'zod';
import { ContentId } from './content';
import { QuestProgressDto } from './game';

const MemberId = z.string().min(1).max(40);

export const PartyQuestMember = z.strictObject({
  id: MemberId,
  displayName: z.string().min(1).max(32),
  /** She plays it (said yes to the leader). */
  joined: z.boolean(),
  /** Steps of her run done so far. */
  done: z.number().int().min(0),
  /** The party waits for her answer to a question before going on. */
  waiting: z.boolean(),
  /** She finished her run. */
  finished: z.boolean(),
});
export type PartyQuestMember = z.infer<typeof PartyQuestMember>;

export const PartyQuestView = z.strictObject({
  questId: ContentId,
  leader: MemberId,
  members: z.array(PartyQuestMember).min(1).max(4),
  /** At a team boss: whose blow it is now (null: no boss under way). */
  turn: MemberId.nullable(),
});
export type PartyQuestView = z.infer<typeof PartyQuestView>;

export const PartyQuestClientMessages = [
  /** The leader asks the party to play this quest together. */
  z.strictObject({ type: z.literal('party-quest-start'), questId: ContentId }),
  /** A member says yes to the leader's quest. */
  z.strictObject({ type: z.literal('party-quest-join'), questId: ContentId }),
  /** Out of the party's quest (her own progress stays as it is); the leader stepping out ends it. */
  z.strictObject({ type: z.literal('party-quest-leave') }),
] as const;

export const PartyQuestServerMessages = [
  /** The party's quest as it is now (null: none). */
  z.strictObject({ type: z.literal('party-quest'), quest: PartyQuestView.nullable() }),
  /** A step shared with the party moved her own progress (a member found, talked or read for everyone). */
  z.strictObject({ type: z.literal('party-quest-progress'), progress: QuestProgressDto }),
] as const;
