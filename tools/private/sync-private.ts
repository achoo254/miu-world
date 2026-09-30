// `pnpm private:sync`: copies the files the project keeps out of git (the HP001 font, the scanned
// textbooks) from the owner's iCloud Drive into `.data/`, checking each hash, so any machine (the Mac at
// work, the Windows PC at home) gets the same files. `pnpm private:check` only reports what is missing;
// the session-start hook runs it so an agent on a new machine knows to sync.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, createReadStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { REPO_ROOT } from '../assets/asset-lib';

const PrivateFiles = z.object({
  folder: z.string().min(1),
  files: z.array(
    z.object({
      from: z.string().min(1),
      to: z.string().regex(/^\.data\//, 'private files land under .data/, which git ignores'),
      bytes: z.number().int().positive(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      why: z.string().min(1),
    }),
  ),
});
type PrivateFiles = z.infer<typeof PrivateFiles>;
type PrivateFile = PrivateFiles['files'][number];

export const MANIFEST = path.join(REPO_ROOT, 'tools/private/private-files.json');

/**
 * iCloud Drive on this machine: `MIU_ICLOUD_DIR` when set, else where Apple puts it on macOS and where
 * iCloud for Windows puts it by default.
 */
export function icloudRoot(env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform, home = os.homedir()): string | null {
  if (env.MIU_ICLOUD_DIR) return env.MIU_ICLOUD_DIR;
  if (platform === 'darwin') return path.join(home, 'Library/Mobile Documents/com~apple~CloudDocs');
  if (platform === 'win32') return path.join(home, 'iCloudDrive');
  return null;
}

export type FileState = 'ok' | 'copied' | 'missing' | 'not-downloaded' | 'no-source' | 'source-changed';
export interface FileReport {
  file: PrivateFile;
  state: FileState;
}

async function sha256(file: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk as Buffer);
  return hash.digest('hex');
}

/** macOS keeps a file that is still only in the cloud as a `.name.icloud` placeholder beside it. */
function cloudPlaceholder(source: string): string {
  return path.join(path.dirname(source), `.${path.basename(source)}.icloud`);
}

/**
 * Brings every file up to date. `check` only compares sizes (fast enough for every session start);
 * a real sync hashes both ends and never copies a source whose hash differs from the manifest.
 */
export async function syncPrivate({ manifest, repo, icloud, check }: { manifest: PrivateFiles; repo: string; icloud: string | null; check: boolean }): Promise<FileReport[]> {
  const reports: FileReport[] = [];
  for (const file of manifest.files) {
    const target = path.join(repo, file.to);
    const present = existsSync(target) && statSync(target).size === file.bytes;
    if (present && (check || (await sha256(target)) === file.sha256)) {
      reports.push({ file, state: 'ok' });
      continue;
    }
    if (check) {
      reports.push({ file, state: 'missing' });
      continue;
    }
    const source = icloud ? path.join(icloud, manifest.folder, file.from) : null;
    if (!source) {
      reports.push({ file, state: 'no-source' });
      continue;
    }
    if (!existsSync(source)) {
      const inCloudOnly = existsSync(cloudPlaceholder(source));
      // Ask iCloud to download it; the next run copies it.
      if (inCloudOnly && process.platform === 'darwin') execFileSync('brctl', ['download', source], { stdio: 'ignore' });
      reports.push({ file, state: inCloudOnly ? 'not-downloaded' : 'no-source' });
      continue;
    }
    if ((await sha256(source)) !== file.sha256) {
      reports.push({ file, state: 'source-changed' });
      continue;
    }
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(source, target);
    reports.push({ file, state: 'copied' });
  }
  return reports;
}

const MESSAGES: Record<Exclude<FileState, 'ok'>, string> = {
  copied: 'đã chép từ iCloud',
  missing: 'thiếu trên máy này',
  'not-downloaded': 'iCloud chưa tải file về máy (đã yêu cầu tải; chờ tải xong rồi chạy lại)',
  'no-source': 'không thấy trong thư mục iCloud (kiểm iCloud Drive đã bật và đồng bộ, hoặc đặt MIU_ICLOUD_DIR)',
  'source-changed': 'file trên iCloud khác sha256 trong private-files.json; không chép',
};

async function main(): Promise<void> {
  const check = process.argv.includes('--check');
  const manifest = PrivateFiles.parse(JSON.parse(readFileSync(MANIFEST, 'utf8')));
  const icloud = icloudRoot();
  const reports = await syncPrivate({ manifest, repo: REPO_ROOT, icloud, check });
  const pending = reports.filter((r) => r.state !== 'ok' && r.state !== 'copied');
  if (check) {
    // Silent when everything is here, so the session-start hook adds nothing to a normal session.
    if (pending.length > 0) {
      console.log(`Máy này thiếu ${pending.length} file ngoài git (${pending.map((r) => r.file.to).join(', ')}). Chạy \`pnpm private:sync\` để kéo từ iCloud (thư mục ${manifest.folder}).`);
    }
    return;
  }
  for (const r of reports) if (r.state !== 'ok') console.log(`${r.file.to}: ${MESSAGES[r.state]}`);
  console.log(pending.length === 0 ? `private:sync OK — ${reports.length} file có mặt, đúng sha256` : `private:sync: còn ${pending.length} file chưa có`);
  if (pending.length > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
