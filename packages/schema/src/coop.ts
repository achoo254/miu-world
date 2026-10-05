// Co-op challenges on the wire (Master Plan §8): the team's lobby (who plays, who is ready, the countdown), the
// challenge as each player sees it (her clues, her questions, whose turn, the shared HP), her actions (share a
// clue, answer, hold), and the end with what the server paid her. Every word comes from the content or a fixed
// list; the server deals the questions and grades the answers, and never sends an answer before it is asked for.
import { z } from 'zod';
import { ContentId, CoopMode, RewardSpec } from './content';
import { NotebookLine, QuestCompletion } from './game';

/** An id on the wire: a player's public id or a companion bot's id. */
const MemberId = z.string().min(1).max(40);
const Name = z.string().min(1).max(32);

/** The leader's start runs down this long before the challenge opens (anyone may still step out). */
export const COOP_COUNTDOWN_MS = 3_000;
/** A player who drops out (and has no companion bot to stand in) is waited for this long. */
export const COOP_PAUSE_MS = 60_000;
/** A rope held in a `together` round stays held this long. */
export const COOP_HOLD_MS = 15_000;

export const CoopLobbyMember = z.strictObject({
  id: MemberId,
  displayName: Name,
  isBot: z.boolean(),
  species: z.string().min(1).max(32),
  /** In: she said she plays (the leader and companion bots always are). */
  ready: z.boolean(),
});
export type CoopLobbyMember = z.infer<typeof CoopLobbyMember>;

export const CoopLobbyView = z.strictObject({
  questId: ContentId,
  leader: MemberId,
  members: z.array(CoopLobbyMember).min(1).max(4),
  /** Places of the challenge's team. */
  seats: z.number().int().min(2).max(4),
  /** Companion bots that will fill free places (a lone player with her bot switch on). */
  botsFill: z.number().int().min(0).max(3),
  /** The countdown after the leader's start (ms left), null before it. */
  startsInMs: z.number().int().min(0).nullable(),
});
export type CoopLobbyView = z.infer<typeof CoopLobbyView>;

const Choice = z.strictObject({ id: ContentId, text: z.string().min(1) });

/** A question as players see it: never its answer. */
export const CoopTaskView = z.strictObject({
  id: ContentId,
  prompt: z.string().min(1),
  choices: z.array(Choice).min(2),
  en: z.strictObject({ prompt: z.string().min(1), choices: z.array(z.string().min(1)) }).optional(),
});
export type CoopTaskView = z.infer<typeof CoopTaskView>;

export const CoopSeatView = z.strictObject({
  id: MemberId,
  displayName: Name,
  isBot: z.boolean(),
  species: z.string().min(1).max(32),
  /** A companion bot plays this player's place while she is away or after she left. */
  standIn: z.strictObject({ id: MemberId, displayName: Name }).nullable(),
  /** She dropped out and is waited for. */
  away: z.boolean(),
});
export type CoopSeatView = z.infer<typeof CoopSeatView>;

const Bilingual = { text: z.string().min(1), en: z.string().min(1).nullable() };

/** What happened last: who answered, the line the host says, and the question with its answer to copy. */
export const CoopEvent = z.strictObject({
  seq: z.number().int().min(0),
  by: MemberId,
  kind: z.enum(['right', 'wrong', 'shared', 'held', 'round', 'won']),
  line: z.string().nullable(),
  lineEn: z.string().nullable(),
  copy: NotebookLine.nullable(),
});
export type CoopEvent = z.infer<typeof CoopEvent>;

/** The challenge as one player sees it now. */
export const CoopStateView = z.strictObject({
  questId: ContentId,
  mode: CoopMode,
  self: MemberId,
  status: z.enum(['playing', 'paused', 'done']),
  /** While paused: the player waited for, and the ms left before the team goes on without her. */
  waitingFor: z.strictObject({ id: MemberId, displayName: Name, msLeft: z.number().int().min(0) }).nullable(),
  /** Round (pieces, together) or right blows so far (team-boss), and how many there are. */
  round: z.number().int().min(0),
  rounds: z.number().int().min(1),
  seats: z.array(CoopSeatView).min(1).max(4),
  /** Pieces and team-boss: whose answer it is, and the question everyone sees. */
  turn: MemberId.nullable(),
  task: CoopTaskView.nullable(),
  /** Pieces: each clue with its place; its text only when it is hers or shared. */
  pieces: z.array(z.strictObject({ index: z.number().int().min(0), seat: MemberId, shared: z.boolean(), text: z.string().nullable(), en: z.string().nullable() })),
  /** Together: what the team pulls, each question with its place (hers in full while not done), and the holds. */
  title: z.strictObject(Bilingual).nullable(),
  tasks: z.array(z.strictObject({ id: ContentId, seat: MemberId, done: z.boolean(), task: CoopTaskView.nullable() })),
  holds: z.array(z.strictObject({ seat: MemberId, msLeft: z.number().int().min(0) })),
  boss: z.strictObject({ name: z.string().min(1), nameEn: z.string().nullable(), hp: z.number().int().min(0), maxHp: z.number().int().positive() }).nullable(),
  last: CoopEvent.nullable(),
});
export type CoopStateView = z.infer<typeof CoopStateView>;

/** What the server paid one player for a finished challenge (null reward: not paid, see `unpaid`). */
export const CoopResult = z.strictObject({
  reward: RewardSpec.nullable(),
  completion: QuestCompletion.nullable(),
  /** Why nothing was paid: she did not play a part, or the server could not record it. */
  unpaid: z.enum(['no-part', 'failed']).nullable(),
});
export type CoopResult = z.infer<typeof CoopResult>;

/** A player's move in the challenge; the server checks it is hers to make. */
export const CoopAction = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('share'), piece: z.number().int().min(0).max(3) }),
  z.strictObject({ kind: z.literal('answer'), task: ContentId, choice: ContentId }),
  z.strictObject({ kind: z.literal('hold') }),
]);
export type CoopAction = z.infer<typeof CoopAction>;

export const CoopHelpLayer = z.enum(['hint', 'answer']);
export type CoopHelpLayer = z.infer<typeof CoopHelpLayer>;

/** Why her challenge ended: won, she stepped out, or it closed (the lobby was cancelled, no player left). */
export const CoopEndReason = z.enum(['done', 'left', 'closed']);
export type CoopEndReason = z.infer<typeof CoopEndReason>;

export const CoopClientMessages = [
  /** The leader (or a player alone) opens the lobby of a co-op challenge at its host. */
  z.strictObject({ type: z.literal('coop-open'), questId: ContentId }),
  z.strictObject({ type: z.literal('coop-ready'), ready: z.boolean() }),
  /** The leader starts: the countdown runs, then the challenge opens for the leader and every ready player. */
  z.strictObject({ type: z.literal('coop-start') }),
  /** Out of the lobby or the challenge (nothing learnt is lost; the leader leaving the lobby closes it). */
  z.strictObject({ type: z.literal('coop-leave') }),
  z.strictObject({ type: z.literal('coop-act'), action: CoopAction }),
  z.strictObject({ type: z.literal('coop-help'), task: ContentId, layer: CoopHelpLayer }),
] as const;

export const CoopServerMessages = [
  /** Her team's lobby as it is now (null: closed, or the challenge opened). */
  z.strictObject({ type: z.literal('coop-lobby'), lobby: CoopLobbyView.nullable() }),
  z.strictObject({ type: z.literal('coop-state'), state: CoopStateView }),
  z.strictObject({ type: z.literal('coop-end'), questId: ContentId, reason: CoopEndReason, result: CoopResult.nullable() }),
  /** A support layer for one of her questions: the hint, or the answer with its explanation. */
  z.strictObject({
    type: z.literal('coop-help'),
    task: ContentId,
    layer: CoopHelpLayer,
    text: z.string().min(1),
    textEn: z.string().nullable(),
    explanation: z.string().nullable(),
    explanationEn: z.string().nullable(),
  }),
] as const;
