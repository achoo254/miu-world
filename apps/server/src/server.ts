import { existsSync } from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { createApp } from './app';
import { loadConfig } from './config';
import { loadContentCatalog } from './content/content-catalog';
import { DEV_PGLITE_DIR, openPglite, openPostgres, type Db } from './db/client';
import { childProfiles, parents } from './db/schema';
import { CharacterEvents } from './character/character-events';
import { PlayerEvents } from './player/player-events';
import { dbFriendStore, type OnlineLookup } from './friend/friend-store';
import { BotRunner } from './multiplayer/bot-runner';
import { MultiplayerHub } from './multiplayer/multiplayer-hub';
import { dbMultiplayerStore, sessionAuthenticator } from './multiplayer/multiplayer-store';
import { CoopService } from './coop/coop-service';
import { dbCoopRewards } from './reward/coop-reward';
import { PartyQuestService, type PartyQuestHooks } from './coop/party-quest';

const config = loadConfig();
const pgliteDir = config.pgliteDir === null ? undefined : (config.pgliteDir ?? DEV_PGLITE_DIR);
// PG_VERSION is written when PGlite creates a data directory: its absence means a brand-new, empty database.
const freshPglite = !config.databaseUrl && pgliteDir !== undefined && !existsSync(path.join(pgliteDir, 'PG_VERSION'));
const { db } = config.databaseUrl ? await openPostgres(config.databaseUrl) : await openPglite(pgliteDir);
const content = loadContentCatalog({ extraQuestDir: config.extraQuestDir ?? undefined });
const characterEvents = new CharacterEvents();
const playerEvents = new PlayerEvents();
/** The hub, once the server listens: the friends lists ask it who is online. */
let hub: MultiplayerHub | null = null;
const online: OnlineLookup = {
  player: (childId) => hub?.whereIsPlayer(childId) ?? null,
  bot: (botId) => hub?.whereIsBot(botId) ?? null,
};
/** Quests played as a party, once the hub runs (until then every step is solo play). */
let partyQuestService: PartyQuestService | null = null;
const partyQuests: PartyQuestHooks = {
  gate: async (...args) => (partyQuestService ? partyQuestService.gate(...args) : 'ok'),
  recorded: async (...args) => partyQuestService?.recorded(...args),
};
const app = createApp({ config, db, content, characterEvents, playerEvents, online, partyQuests });

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

const multiplayer = new MultiplayerHub(server, {
  store: dbMultiplayerStore(db),
  friends: dbFriendStore(db),
  authenticate: sessionAuthenticator(db, config, content.consent.version, () => new Date()),
  allowedOrigins: config.allowedOrigins,
});
hub = multiplayer;
characterEvents.on((childId, character) => multiplayer.characterSaved(childId, character));
playerEvents.on((event) => multiplayer.playerEvent(event));
const botRunner = new BotRunner(multiplayer);
botRunner.start();
// Co-op challenges: parties (or a player with companion bots) play them over the hub; the server pays each player.
const coop = new CoopService({
  host: multiplayer.coopHost(),
  quest: (id) => {
    const quest = content.quests.get(id);
    return quest?.status === 'active' && quest.category === 'coop' ? quest : null;
  },
  rewards: dbCoopRewards(db, content),
  bots: botRunner.coopDriver(),
});
multiplayer.setCoop(coop);
// Any lesson or story chapter played by a party: shared exploring, each member's own answers, team bosses.
partyQuestService = new PartyQuestService({ db, content, host: multiplayer.coopHost() });
multiplayer.setPartyQuests(partyQuestService);
console.log('multiplayer hub and companion bot runner active');
