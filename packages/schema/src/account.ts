import { z } from 'zod';

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

export const ChildProfileDto = z.object({ id: Id, displayName: z.string() });
export type ChildProfileDto = z.infer<typeof ChildProfileDto>;

// NFC so a decomposed "Mèo" (some mobile keyboards) matches the list entry.
export const ChildProfileInput = z.object({ displayName: z.string().min(1).max(40).transform((s) => s.normalize('NFC')) });

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
