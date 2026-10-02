// What the child has done so far on the step on screen (owner, 02/10/2026: a reload keeps it): the dialogue
// line reached, the choices picked, the pieces placed, the blanks filled, the wrong tries and the support
// layer open, and whether the step's screen was open. Kept in this browser per child and quest, for the
// current step only; dropped once the step is done, when the quest moves on, or after DRAFT_DAYS. Nothing
// here is graded or trusted: the server checks every answer as before. Storage may be missing or full
// (private windows): the step then simply starts afresh.
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

const PREFIX = 'miu.step-draft.v1';
/** A draft left this long is forgotten. */
const DRAFT_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface StepDraft {
  step: string;
  /** The step's screen was open when the child left. */
  open: boolean;
  savedAt: number;
  fields: Record<string, unknown>;
}

const keyOf = (owner: string, quest: string): string => `${PREFIX}:${owner}:${quest}`;

function isDraft(value: unknown): value is StepDraft {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.step === 'string' && typeof v.open === 'boolean' && typeof v.savedAt === 'number' && typeof v.fields === 'object' && v.fields !== null;
}

/** The draft of `quest` for its step `step`, if one was left and is still fresh. */
export function readDraft(owner: string, quest: string, step: string, now = Date.now()): StepDraft | null {
  try {
    const raw = window.localStorage.getItem(keyOf(owner, quest));
    if (!raw) return null;
    const draft: unknown = JSON.parse(raw);
    if (!isDraft(draft) || draft.step !== step || now - draft.savedAt > DRAFT_DAYS * DAY_MS) return null;
    return draft;
  } catch {
    return null;
  }
}

function writeDraft(owner: string, quest: string, draft: StepDraft): void {
  try {
    window.localStorage.setItem(keyOf(owner, quest), JSON.stringify(draft));
  } catch {
    // No storage (private window, full): the step just starts afresh next time.
  }
}

/** Changes the draft of `quest`'s step `step` (starting a new one if the stored draft was for another step). */
export function updateDraft(owner: string, quest: string, step: string, change: (draft: StepDraft) => StepDraft, now = Date.now()): void {
  const current = readDraft(owner, quest, step, now) ?? { step, open: false, savedAt: now, fields: {} };
  writeDraft(owner, quest, { ...change(current), step, savedAt: now });
}

/** Forgets the draft of `quest` (its step was done, or the quest is over). */
export function clearDraft(owner: string, quest: string): void {
  try {
    window.localStorage.removeItem(keyOf(owner, quest));
  } catch {
    // Nothing to forget without storage.
  }
}

interface DraftScope {
  owner: string;
  quest: string;
  step: string;
}

const DraftContext = createContext<DraftScope | null>(null);

/** Keeps what the screens inside do on this step (no draft without an owner, e.g. in tests). */
export function StepDraftScope({ owner, quest, step, children }: { owner: string | null; quest: string; step: string; children: ReactNode }) {
  return <DraftContext.Provider value={owner ? { owner, quest, step } : null}>{children}</DraftContext.Provider>;
}

/**
 * `useState` that the step's draft keeps under `field`: it starts from the draft when there is a valid one
 * (`valid` checks the stored value, which a newer build may have shaped differently) and writes every change.
 */
export function useDraftState<T>(field: string, initial: T | (() => T), valid: (value: unknown) => value is T): [T, (next: T | ((prev: T) => T)) => void] {
  const scope = useContext(DraftContext);
  const [value, setValue] = useState<T>(() => {
    const stored = scope ? readDraft(scope.owner, scope.quest, scope.step)?.fields[field] : undefined;
    if (stored !== undefined && valid(stored)) return stored;
    return typeof initial === 'function' ? (initial as () => T)() : initial;
  });
  const set = useCallback(
    (next: T | ((prev: T) => T)): void => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next;
        if (scope) updateDraft(scope.owner, scope.quest, scope.step, (d) => ({ ...d, fields: { ...d.fields, [field]: resolved } }));
        return resolved;
      });
    },
    [scope, field],
  );
  return [value, set];
}

/** Checks for the shapes the step screens keep. */
export const isString = (v: unknown): v is string => typeof v === 'string';
export const isStringOrNull = (v: unknown): v is string | null => v === null || typeof v === 'string';
export const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0;
export const isNumberOrNull = (v: unknown): v is number | null => v === null || (typeof v === 'number' && Number.isFinite(v));
export const isStringList = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString);
export const isSlotList = (v: unknown): v is Array<string | null> => Array.isArray(v) && v.every(isStringOrNull);
export const isStringRecord = (v: unknown): v is Record<string, string> => typeof v === 'object' && v !== null && !Array.isArray(v) && Object.values(v).every(isString);
export const isPairList = (v: unknown): v is Array<[string, string]> => Array.isArray(v) && v.every((p) => Array.isArray(p) && p.length === 2 && p.every(isString));
