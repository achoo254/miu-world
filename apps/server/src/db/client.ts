import { randomUUID } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres';
import { migrate as migrateNodePg } from 'drizzle-orm/node-postgres/migrator';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import pg from 'pg';
import * as schema from './schema';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export interface DbHandle {
  db: Db;
  close(): Promise<void>;
}

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MIGRATIONS = path.join(SERVER_DIR, 'drizzle');
export const DEV_PGLITE_DIR = path.resolve(SERVER_DIR, '../../.data/pglite');

/** Real Postgres (CI, production). Migrations run on open so the schema always matches the code. */
export async function openPostgres(connectionString: string): Promise<DbHandle> {
  const pool = new pg.Pool({ connectionString, max: 10 });
  const db = drizzleNodePg(pool, { schema });
  await migrateNodePg(db, { migrationsFolder: MIGRATIONS });
  return { db, close: () => pool.end() };
}

/** Embedded Postgres for dev (file under `.data/`, gitignored) and tests (in-memory when `dir` is omitted). */
export async function openPglite(dir?: string): Promise<DbHandle> {
  // Loaded on demand: the production bundle runs on Postgres and ships without PGlite.
  const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('drizzle-orm/pglite'),
    import('drizzle-orm/pglite/migrator'),
  ]);
  if (dir) await mkdir(dir, { recursive: true });
  const client = dir ? new PGlite(dir) : new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return { db, close: () => client.close() };
}

/**
 * A freshly migrated in-memory PGlite, dumped: the test run migrates once (vitest global setup) and
 * every test file starts from this copy instead of booting Postgres and migrating again.
 */
export async function migratedPgliteDump(): Promise<Blob> {
  const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('drizzle-orm/pglite'),
    import('drizzle-orm/pglite/migrator'),
  ]);
  const client = new PGlite();
  await migrate(drizzle(client, { schema }), { migrationsFolder: MIGRATIONS });
  const dump = await client.dumpDataDir('none');
  await client.close();
  return dump;
}

async function openPgliteDump(file: string): Promise<DbHandle> {
  const [{ PGlite }, { drizzle }] = await Promise.all([import('@electric-sql/pglite'), import('drizzle-orm/pglite')]);
  const client = new PGlite({ loadDataDir: new Blob([await readFile(file)]) });
  return { db: drizzle(client, { schema }), close: () => client.close() };
}

/**
 * Isolated database for one test file. With `DATABASE_URL` (CI Postgres service) it creates a
 * throw-away database on that server so parallel test files never share rows; otherwise PGlite
 * in-memory, from the run's migrated template when there is one. Same test code runs against both.
 */
export async function createTestDb(): Promise<DbHandle> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    // Set by the test run's global setup: start from the migrated copy (see `migratedPgliteDump`).
    const template = process.env.MIU_PGLITE_TEMPLATE;
    return template ? openPgliteDump(template) : openPglite();
  }
  const name = `miu_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new pg.Client({ connectionString: url });
  await admin.connect();
  await admin.query(`CREATE DATABASE ${name}`);
  await admin.end();
  const target = new URL(url);
  target.pathname = `/${name}`;
  const handle = await openPostgres(target.toString());
  return {
    db: handle.db,
    async close() {
      await handle.close();
      const cleanup = new pg.Client({ connectionString: url });
      await cleanup.connect();
      await cleanup.query(`DROP DATABASE IF EXISTS ${name}`);
      await cleanup.end();
    },
  };
}
