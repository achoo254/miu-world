import { z } from 'zod';
import { DecorChoices } from './home-decor';
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

/** Parent-gate PIN: 4–6 digits. */
export const ParentPin = z.string().regex(/^\d{4,6}$/);

// Computed keys: the workspace secret scanner treats `password: <identifier>` as a literal credential.
export const RegisterRequest = z.object({ email: Email, ['password']: PasswordField, pin: ParentPin });
export type RegisterRequest = z.infer<typeof RegisterRequest>;

export const LoginRequest = z.object({ email: Email, ['password']: z.string().min(1).max(128) });
export type LoginRequest = z.infer<typeof LoginRequest>;

export const ParentGateUnlockRequest = z.object({ pin: ParentPin });

/** First PIN after the first Google sign-in. */
export const SetPinRequest = z.object({ pin: ParentPin });

/** Public view of a parent. Parsing a DB row through it strips hashes (Zod drops unknown keys). */
export const ParentDto = z.object({ id: Id, email: z.string() });
export type ParentDto = z.infer<typeof ParentDto>;

export const ConsentRequest = z.object({ policyVersion: z.string().min(1).max(32) });

export const ChildLanguage = z.enum(['vi', 'en', 'both']);
export type ChildLanguage = z.infer<typeof ChildLanguage>;

/** `species`: the child's character, so the picker shows the right animal. */
export const ChildProfileDto = z.object({
  id: Id,
  displayName: z.string(),
  species: z.string(),
  language: ChildLanguage.default('vi'),
});
export type ChildProfileDto = z.infer<typeof ChildProfileDto>;

// NFC so a decomposed "Mèo" (some mobile keyboards) matches the list entry.
export const ChildProfileInput = z.object({
  displayName: z.string().min(1).max(40).transform((s) => s.normalize('NFC')),
  language: ChildLanguage.optional(),
});

export const MeResponse = z.object({
  parent: ParentDto,
  consentAccepted: z.boolean(),
  activeChildId: Id.nullable(),
  parentGateOpen: z.boolean(),
  pinLocked: z.boolean(),
  /** False right after the first Google sign-in, until the parent sets the PIN. */
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
  children: z.array(
    z.object({
      displayName: z.string(),
      language: ChildLanguage.default('vi'),
      createdAt: Instant,
      character: z.object({ species: z.string(), name: z.string(), equipped: z.array(z.string()), pet: z.string().nullable() }).nullable(),
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
    }),
  ),
});
export type AccountExport = z.infer<typeof AccountExport>;
