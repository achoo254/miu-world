import { existsSync } from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { createApp } from './app';
import { loadConfig } from './config';
import { loadContentCatalog } from './content/content-catalog';
import { DEV_PGLITE_DIR, openPglite, openPostgres, type Db } from './db/client';
import { childProfiles, parents } from './db/schema';
import { BotRunner } from './multiplayer/bot-runner';
import { MultiplayerHub } from './multiplayer/multiplayer-hub';

const config = loadConfig();
const pgliteDir = config.pgliteDir === null ? undefined : (config.pgliteDir ?? DEV_PGLITE_DIR);
// PG_VERSION is written when PGlite creates a data directory: its absence means a brand-new, empty database.
const freshPglite = !config.databaseUrl && pgliteDir !== undefined && !existsSync(path.join(pgliteDir, 'PG_VERSION'));
const { db } = config.databaseUrl ? await openPostgres(config.databaseUrl) : await openPglite(pgliteDir);
const content = loadContentCatalog({ extraQuestDir: config.extraQuestDir ?? undefined });
const app = createApp({ config, db, content });

/** Which database this run uses, so a dev who suddenly sees no accounts knows whether it is a new one. */
async function describeDatabase(database: Db): Promise<string> {
  if (config.databaseUrl) return 'database: Postgres (DATABASE_URL)';
  const where = pgliteDir === undefined ? 'PGlite in memory (everything is lost when the server stops)' : `PGlite at ${pgliteDir}`;
  const count = async (table: typeof parents | typeof childProfiles): Promise<number> =>
    (await database.select({ n: sql<number>`count(*)::int` }).from(table))[0]?.n ?? 0;
  const [parentCount, childCount] = await Promise.all([count(parents), count(childProfiles)]);
  return `database: ${where}${freshPglite ? ', just created empty' : ''}; ${parentCount} parent account(s), ${childCount} child profile(s)`;
}

console.log(await describeDatabase(db));
// Loopback only: the web dev/preview server proxies /api, so the API is never exposed on the LAN directly.
const server = app.listen(config.port, '127.0.0.1', () => {
  console.log(`miu server listening on :${config.port} (${config.nodeEnv})`);
});

const hub = new MultiplayerHub(server);
const botRunner = new BotRunner(hub);
botRunner.start();
console.log('multiplayer hub and companion bot runner active');
