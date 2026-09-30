import { createApp } from './app';
import { loadConfig } from './config';
import { loadContentCatalog } from './content/content-catalog';
import { DEV_PGLITE_DIR, openPglite, openPostgres } from './db/client';

const config = loadConfig();
const { db } = config.databaseUrl
  ? await openPostgres(config.databaseUrl)
  : await openPglite(config.pgliteDir === null ? undefined : (config.pgliteDir ?? DEV_PGLITE_DIR));
const content = loadContentCatalog({ extraQuestDir: config.extraQuestDir ?? undefined });
const app = createApp({ config, db, content });

// Loopback only: the web dev/preview server proxies /api, so the API is never exposed on the LAN directly.
app.listen(config.port, '127.0.0.1', () => {
  console.log(`miu server listening on :${config.port} (${config.nodeEnv})`);
});
