import type { z } from 'zod';
import { t, type TextKey } from './i18n/i18n';

/** Server error with its stable code (`invalid-credentials`, `parent-gate-closed`…). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

/**
 * Same-origin JSON call; responses are validated so the UI never trusts an unexpected shape.
 * `keepalive` lets a small write finish while the page is being closed or hidden.
 */
export async function api<S extends z.ZodType>(method: string, path: string, schema: S, body?: unknown, options: { keepalive?: boolean } = {}): Promise<z.infer<S>> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      keepalive: options.keepalive,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'network');
  }
  if (res.status === 204) return schema.parse(undefined);
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const code = typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string' ? data.error : 'unknown';
    throw new ApiError(res.status, code);
  }
  return schema.parse(data);
}

/** Server error code → its message (locales `errors.*`). */
const MESSAGES: Readonly<Record<string, TextKey>> = {
  network: 'errors.network',
  'invalid-input': 'errors.invalidInput',
  'invalid-credentials': 'errors.invalidCredentials',
  'email-taken': 'errors.emailTaken',
  'rate-limited': 'errors.rateLimited',
  'invalid-pin': 'errors.invalidPin',
  'pin-locked': 'errors.pinLocked',
  'parent-gate-closed': 'errors.parentGateClosed',
  'primary-player': 'errors.primaryPlayer',
  'consent-required': 'errors.consentRequired',
  'profile-limit': 'errors.profileLimit',
  'invalid-display-name': 'errors.invalidDisplayName',
  'not-found': 'errors.notFound',
  'pin-not-set': 'errors.pinNotSet',
  'equipment-locked': 'errors.equipmentLocked',
  'pet-locked': 'errors.petLocked',
  'invalid-equipment': 'errors.invalidEquipment',
  'invalid-character-name': 'errors.invalidCharacterName',
  'invalid-species': 'errors.invalidSpecies',
};

/** The message for a failed call, in the display mode chosen when it failed. */
export function errorMessage(err: unknown): string {
  const code = err instanceof ApiError ? err.code : 'unknown';
  return t(MESSAGES[code] ?? 'errors.unknown');
}
