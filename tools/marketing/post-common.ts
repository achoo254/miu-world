// What the two posting modules share: the request they take, what they return, and the error they raise. Posting is
// opt-in: every module does nothing but describe the post unless `publish` is true.

/** `private` and `unlisted` are YouTube's; on Facebook only `public` publishes, the others leave the video unpublished (an admin-only draft). */
export const PRIVACY = ['private', 'unlisted', 'public'] as const;
export type Privacy = (typeof PRIVACY)[number];
export const DEFAULT_PRIVACY: Privacy = 'private';

export interface PostRequest {
  /** The finished clip (`.mp4`). */
  clipFile: string;
  title: string;
  description: string;
  privacy: Privacy;
}

export type PostOutcome =
  | { status: 'dry-run'; summary: string }
  | { status: 'posted'; id: string; url: string };

/** What a module needs from its surroundings; the defaults are the real ones. */
export interface PostEnvironment {
  /** Post for real; false (the default) only describes what would be sent. */
  publish: boolean;
  fetch?: typeof fetch;
  /** The token file; the one named by `MIU_MARKETING_TOKEN_FILE` when absent. A dry run never opens it. */
  tokenFile?: string;
}

/** A failure the person running the tool can act on. The message never holds a secret: see `scrub`. */
export class PostError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'PostError';
  }
}

/** `text` with every secret value replaced, for messages that quote what a service said. */
export function scrub(text: string, secrets: readonly string[]): string {
  return secrets.filter((s) => s.length >= 4).reduce((out, secret) => out.split(secret).join('[secret]'), text);
}

/** A response's body as short text for an error message: the service's own words, cut, with no secret in them. */
export async function describeFailure(response: Response, secrets: readonly string[]): Promise<string> {
  const body = await response.text().catch(() => '');
  return scrub(`HTTP ${response.status} ${response.statusText}${body ? `: ${body.slice(0, 300)}` : ''}`, secrets);
}
