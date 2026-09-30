// Vitest global setup: migrates one PGlite database before any test file runs and leaves its dump in a
// temp file; `createTestDb` loads that copy, so a file under full parallel load boots in a fraction of
// the time instead of timing out while it migrates. Not used with DATABASE_URL (CI Postgres).
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { migratedPgliteDump } from '../src/db/client';

export default async function setup(): Promise<() => Promise<void>> {
  if (process.env.DATABASE_URL) return async () => undefined;
  const dir = await mkdtemp(path.join(tmpdir(), 'miu-pglite-'));
  const file = path.join(dir, 'template.tar');
  await writeFile(file, Buffer.from(await (await migratedPgliteDump()).arrayBuffer()));
  process.env.MIU_PGLITE_TEMPLATE = file;
  return async () => {
    delete process.env.MIU_PGLITE_TEMPLATE;
    await rm(dir, { recursive: true, force: true });
  };
}
