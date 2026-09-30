// `pnpm dev`: starts the API (8787) and the web dev server (5173) together, so the game is playable at
// http://localhost:5173 with one command. Parent sign-in is Google OAuth: the client comes from the owner's
// token file in iCloud Drive (`access-tokens.json`, entry `accounts.google.com` used by miu-world) and goes
// straight into the API's environment; nothing is printed or written to disk. Ctrl+C stops both.
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { REPO_ROOT } from '../assets/asset-lib';
import { icloudRoot } from '../private/sync-private';

/** Where Google sends the parent back in dev: the Vite proxy on 5173 forwards it to the API. */
export const DEV_REDIRECT_PREFIX = 'http://localhost:5173/';

// `used_by` is one project name or a list of them; entries of other services may carry any shape.
const TokenEntry = z.object({ service: z.string(), used_by: z.union([z.string(), z.array(z.string())]).optional(), token: z.unknown() });
const TokenFile = z.object({ tokens: z.array(z.unknown()) });
const GoogleClient = z.object({ client_id: z.string().min(1), client_secret: z.string().min(1), redirect_uris: z.array(z.string()) });

/** The token file: `MIU_TOKEN_FILE` when set, else next to the private files in iCloud Drive. */
export function tokenFilePath(env: NodeJS.ProcessEnv = process.env): string | null {
  if (env.MIU_TOKEN_FILE) return env.MIU_TOKEN_FILE;
  const root = icloudRoot(env);
  return root ? path.join(root, 'cong-viec/Cong viec/ENV production/access-tokens.json') : null;
}

/** The API's Google env from the token file's contents, or null when the dev client is not there. */
export function googleEnv(tokenFileJson: unknown): Record<string, string> | null {
  const file = TokenFile.safeParse(tokenFileJson);
  const entry = (file.success ? file.data.tokens : [])
    .map((t) => TokenEntry.safeParse(t))
    .flatMap((t) => (t.success ? [t.data] : []))
    .find((t) => t.service === 'accounts.google.com' && [t.used_by ?? []].flat().includes('miu-world'));
  const client = GoogleClient.safeParse(entry?.token);
  if (!client.success) return null;
  const redirect = client.data.redirect_uris.find((u) => u.startsWith(DEV_REDIRECT_PREFIX));
  if (!redirect) return null;
  return { GOOGLE_CLIENT_ID: client.data.client_id, GOOGLE_CLIENT_SECRET: client.data.client_secret, GOOGLE_REDIRECT_URI: redirect };
}

function loadGoogleEnv(): Record<string, string> {
  const file = tokenFilePath();
  const google = file && existsSync(file) ? googleEnv(JSON.parse(readFileSync(file, 'utf8'))) : null;
  if (google) return google;
  console.warn(
    `[dev] Không tìm thấy Google OAuth client cho dev (${file ?? 'không xác định được iCloud Drive'}): API vẫn chạy nhưng không đăng nhập phụ huynh được. ` +
      'Đặt MIU_TOKEN_FILE hoặc MIU_ICLOUD_DIR rồi chạy lại.',
  );
  return {};
}

/** Runs `pnpm <args>` with each output line prefixed, so the two servers stay readable in one terminal. */
function run(label: string, command: string, env: NodeJS.ProcessEnv): ChildProcess {
  // A shell finds `pnpm.cmd` on Windows; the command is a fixed string, never built from input.
  const child = spawn(command, { cwd: REPO_ROOT, env, shell: true });
  for (const stream of [child.stdout, child.stderr]) {
    let rest = '';
    stream?.on('data', (chunk: Buffer) => {
      const lines = (rest + chunk.toString()).split(/\r?\n/);
      rest = lines.pop() ?? '';
      for (const line of lines) console.log(`[${label}] ${line}`);
    });
  }
  return child;
}

/** Stops a server and everything it started (`tsx watch` and Vite leave children behind on Windows otherwise). */
function stop(child: ChildProcess): void {
  if (child.exitCode !== null || child.pid === undefined) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill('SIGTERM');
}

function main(): void {
  const api = run('api', 'pnpm --filter @miu/server dev', { ...process.env, ...loadGoogleEnv() });
  const web = run('web', 'pnpm --filter @miu/web dev', process.env);
  const children = [api, web];
  let stopping = false;
  const shutdown = (code: number) => {
    if (stopping) return;
    stopping = true;
    children.forEach(stop);
    process.exit(code);
  };
  // One server going down leaves a half-working game: stop the other too, and say which one failed.
  for (const [label, child] of [['api', api], ['web', web]] as const) {
    child.on('exit', (code) => {
      if (!stopping) console.error(`[dev] ${label} đã dừng (mã ${code ?? '?'}); dừng luôn phần còn lại.`);
      shutdown(code ?? 1);
    });
  }
  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));
  console.log('[dev] API ở cổng 8787, web ở http://localhost:5173 — mở /play sau khi đăng nhập phụ huynh. Ctrl+C để dừng.');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
