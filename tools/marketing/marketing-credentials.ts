// Where the posting modules find their secrets: entries of the owner's `access-tokens.json` (the file the deployment guide
// describes, kept outside the repo), whose path comes from the environment variable `MIU_MARKETING_TOKEN_FILE`. Read at the
// moment of posting only, never printed: an error names the entry and the missing field, never a value.
import { readFileSync } from 'node:fs';
import { z } from 'zod';

export const TOKEN_FILE_ENV = 'MIU_MARKETING_TOKEN_FILE';

export const YOUTUBE_ENTRY = { service: 'youtube.googleapis.com', usedBy: 'miu-world marketing' } as const;
export const FACEBOOK_ENTRY = { service: 'graph.facebook.com', usedBy: 'miu-world marketing' } as const;

/** OAuth client of the Google Cloud project and the refresh token the owner granted `youtube.upload` with. */
export const YoutubeSecret = z.object({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
  refresh_token: z.string().min(1),
});
export type YoutubeSecret = z.infer<typeof YoutubeSecret>;

/** The Facebook Page the clips go to (its numeric id) and that Page's own access token (never a user token). */
export const FacebookSecret = z.object({
  page_id: z.string().regex(/^\d{5,25}$/),
  page_access_token: z.string().min(1),
});
export type FacebookSecret = z.infer<typeof FacebookSecret>;

const TokenFile = z.object({ tokens: z.array(z.object({ service: z.string(), used_by: z.string(), token: z.unknown() })) });

export class CredentialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CredentialError';
  }
}

/** The path of the token file from the environment, or an error saying which variable to set. */
export function tokenFilePath(env: NodeJS.ProcessEnv = process.env): string {
  const file = env[TOKEN_FILE_ENV];
  if (!file) throw new CredentialError(`set ${TOKEN_FILE_ENV} to the path of access-tokens.json`);
  return file;
}

/** The one entry of `service` / `used_by` in the token file, checked against `schema`. */
export function readSecret<T>(file: string, entry: { service: string; usedBy: string }, schema: z.ZodType<T>): T {
  const label = `${entry.service} / ${entry.usedBy}`;
  let parsed: z.infer<typeof TokenFile>;
  try {
    parsed = TokenFile.parse(JSON.parse(readFileSync(file, 'utf8')));
  } catch {
    // The reason is left out on purpose: a parse error can quote the file.
    throw new CredentialError(`cannot read the token file named by ${TOKEN_FILE_ENV}`);
  }
  const matches = parsed.tokens.filter((t) => t.service === entry.service && t.used_by === entry.usedBy);
  if (matches.length === 0) throw new CredentialError(`the token file has no entry ${label}`);
  if (matches.length > 1) throw new CredentialError(`the token file has ${matches.length} entries ${label}; keep one`);
  const result = schema.safeParse(matches[0]?.token);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((i) => i.path.join('.') || '(token)'))].join(', ');
    throw new CredentialError(`entry ${label} is missing or has a malformed field: ${fields}`);
  }
  return result.data;
}
