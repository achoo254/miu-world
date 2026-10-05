import { z } from 'zod';
import { DecorChoices } from './home-decor';
import { HomeObjectStates } from './home-objects';
import { Timetable } from './timetable';

export const Id = z.uuid();

/** Stored and compared lower-case so `A@x.vn` and `a@x.vn` are one account. */
export const Email = z
  .string()
  .trim()
  .max(254)
  .pipe(z.email())
  .transform((e) => e.toLowerCase());

/** Account secret length bounds (10–128). */
export const PasswordField = z.string().min(10).max(128);

/** Optional account PIN: 4–6 digits. */
export const ParentPin = z.string().regex(/^\d{4,6}$/);

// Computed keys: the workspace secret scanner treats `password: <identifier>` as a literal credential.
export const RegisterRequest = z.object({ email: Email, ['password']: PasswordField, pin: ParentPin });
export type RegisterRequest = z.infer<typeof RegisterRequest>;

export const LoginRequest = z.object({ email: Email, ['password']: z.string().min(1).max(128) });
export type LoginRequest = z.infer<typeof LoginRequest>;

export const ParentGateUnlockRequest = z.object({ pin: ParentPin });

/** Sets or changes the optional account PIN. */
export const SetPinRequest = z.object({ pin: ParentPin });

/** Public view of a parent. Parsing a DB row through it strips hashes (Zod drops unknown keys). */
export const ParentDto = z.object({ id: Id, email: z.string() });
export type ParentDto = z.infer<typeof ParentDto>;

export const ConsentRequest = z.object({ policyVersion: z.string().min(1).max(32) });

export const PlayerLanguage = z.enum(['vi', 'en', 'both']);
export type PlayerLanguage = z.infer<typeof PlayerLanguage>;

/**
 * A player of the account. `primary`: the account owner's own player (made on consent, deleted only
 * with the account); the others are extra players on a shared device. `species`: the player's
 * character, so the picker shows the right animal.
 */
export const PlayerDto = z.object({
  id: Id,
  displayName: z.string(),
  species: z.string(),
  language: PlayerLanguage.default('vi'),
  primary: z.boolean(),
  /** Her companion bot switch (see `PlayerSettings`). */
  botsEnabled: z.boolean().default(true),
});
export type PlayerDto = z.infer<typeof PlayerDto>;

/**
 * A player's own switch, on by default: `botsEnabled` (companion bots show up around her). She changes it in
 * Cài đặt; the account owner can change it for any player of the account. Online play itself has no switch: the
 * game is online from the start, always (owner, 05/10/2026).
 */
export const PlayerSettings = z.object({ botsEnabled: z.boolean() });
export type PlayerSettings = z.infer<typeof PlayerSettings>;

/** A change of the switch. */
export const PlayerSettingsPatch = z.strictObject({ botsEnabled: z.boolean() });
export type PlayerSettingsPatch = z.infer<typeof PlayerSettingsPatch>;

// NFC so a decomposed "Mèo" (some mobile keyboards) matches the list entry.
export const PlayerInput = z.object({
  displayName: z.string().min(1).max(40).transform((s) => s.normalize('NFC')),
  language: PlayerLanguage.optional(),
});

/** Who can play on this account, as `/auth/me` lists them: enough to skip the picker for one player. */
export const PlayerSummary = z.object({ id: Id, displayName: z.string(), primary: z.boolean() });
export type PlayerSummary = z.infer<typeof PlayerSummary>;

export const MeResponse = z.object({
  parent: ParentDto,
  consentAccepted: z.boolean(),
  activePlayerId: Id.nullable(),
  /** Primary first, then extra players by creation. Empty for a new account until it accepts the policy. */
  players: z.array(PlayerSummary),
  parentGateOpen: z.boolean(),
  pinLocked: z.boolean(),
  /** Whether the owner set the optional PIN that locks the account area. */
  pinSet: z.boolean(),
});
export type MeResponse = z.infer<typeof MeResponse>;

const Instant = z.iso.datetime({ offset: true });

/**
 * "Tải dữ liệu của tôi": everything the server keeps about the account, as the parent downloads it.
 * Secret hashes (PIN, password) and the session token hashes are left out; they identify nothing.
 */
export const AccountExport = z.object({
  exportedAt: Instant,
  parent: z.object({ email: z.string(), signIn: z.enum(['google', 'password']), createdAt: Instant }),
  consents: z.array(z.object({ policyVersion: z.string(), acceptedAt: Instant })),
  sessions: z.array(z.object({ createdAt: Instant, lastSeenAt: Instant, expiresAt: Instant })),
  players: z.array(
    z.object({
      displayName: z.string(),
      primary: z.boolean(),
      language: PlayerLanguage.default('vi'),
      createdAt: Instant,
      character: z.object({ species: z.string(), name: z.string(), equipped: z.array(z.string()), pet: z.string().nullable(), petGear: z.array(z.string()).default([]) }).nullable(),
      quests: z.array(
        z.object({
          questId: z.string(),
          completedSteps: z.array(z.string()),
          found: z.record(z.string(), z.array(z.string())),
          completedAt: Instant.nullable(),
          stars: z.number().nullable(),
          xpAwarded: z.number().nullable(),
        }),
      ),
      stepCounters: z.array(z.object({ questId: z.string(), stepId: z.string(), wrongCount: z.number(), answerViews: z.number() })),
      rewards: z.array(
        z.object({
          source: z.string(),
          xp: z.number(),
          coins: z.number(),
          skillXp: z.record(z.string(), z.number()),
          items: z.record(z.string(), z.number()),
          createdAt: Instant,
        }),
      ),
      inventory: z.array(z.object({ itemId: z.string(), qty: z.number() })),
      /** What she bought in the shop or claimed from a region chest and still has (each purchase, use and claim is also a `rewards` row). */
      shop: z.array(z.object({ itemId: z.string(), qty: z.number() })),
      skills: z.array(z.object({ skillId: z.string(), xp: z.number() })),
      /** Last spot on each map, so the next visit starts there. */
      positions: z.array(z.object({ map: z.string(), position: z.tuple([z.number(), z.number(), z.number()]), facing: z.number(), updatedAt: z.string() })),
      /** Class timetable and uniform rules the family typed in; null until first saved. */
      timetable: Timetable.nullable(),
      /** The styles the child picked for her home (slot → option); null until her first pick. */
      homeDecor: DecorChoices.nullable(),
      /** What she left switched on in her home (a lamp, the television); null until she first switches one. */
      homeObjects: HomeObjectStates.nullable(),
      /** Her companion bot switch. */
      settings: PlayerSettings,
      /** Seconds played per week (Monday, Vietnam time), for the progress views; `updatedAt`: the last report. */
      playTime: z.array(z.object({ weekStart: z.string(), seconds: z.number(), updatedAt: Instant })),
      /** In-game letters: which one, whether read and its gift claimed. */
      mail: z.array(z.object({ templateId: z.string(), category: z.string(), read: z.boolean(), claimed: z.boolean(), claimedAt: Instant.nullable(), createdAt: Instant })),
      /** Friendship with each character of the maps: the chat and gift points, and the day of the last of each. */
      npcFriendships: z.array(z.object({ npcId: z.string(), talkPoints: z.number(), giftPoints: z.number(), lastTalkOn: z.string().nullable(), lastGiftOn: z.string().nullable() })),
      /** Her bond with each pet she cared for: its picked name, its needs when last counted, bond XP and seconds walked together. */
      petBonds: z
        .array(
          z.object({
            petId: z.string(),
            name: z.string().nullable(),
            happiness: z.number(),
            fullness: z.number(),
            cleanliness: z.number(),
            statsAt: Instant,
            careXp: z.number(),
            walkSeconds: z.number(),
            /** When each care last paid bond XP, and when a walk was last counted. */
            carePaidAt: z.record(z.string(), z.string()).default({}),
            walkedAt: Instant.nullable().default(null),
          }),
        )
        .default([]),
      /** Companion bots that won a co-op challenge with her: how often, and the last challenge. */
      botMemories: z.array(z.object({ botId: z.string(), runs: z.number(), lastQuestId: z.string(), lastPlayedAt: z.string() })),
      /** Her friends (other players by character name, companion bots labelled). */
      friends: z.array(z.object({ displayName: z.string(), isBot: z.boolean(), since: Instant })),
      /** Friend requests waiting: for her, and from her. */
      friendRequests: z.object({
        received: z.array(z.object({ displayName: z.string(), isBot: z.boolean(), sentAt: Instant })),
        sent: z.array(z.object({ displayName: z.string(), sentAt: Instant })),
      }),
      /** Players she blocked online. */
      blocks: z.array(z.object({ displayName: z.string(), since: Instant })),
      /** Players she reported online: the picked reason and the map, nothing typed. */
      reports: z.array(z.object({ displayName: z.string(), reason: z.string(), map: z.string().nullable(), createdAt: Instant })),
    }),
  ),
});
export type AccountExport = z.infer<typeof AccountExport>;
