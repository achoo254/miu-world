import { randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
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
 * Isolated database for one test file. With `DATABASE_URL` (CI Postgres service) it creates a
 * throw-away database on that server so parallel test files never share rows; otherwise PGlite
 * in-memory. Same test code runs against both.
 */
export async function createTestDb(): Promise<DbHandle> {
  const url = process.env.DATABASE_URL;
  if (!url) return openPglite();
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
