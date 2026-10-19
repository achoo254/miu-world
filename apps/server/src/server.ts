import { existsSync } from 'node:fs';
import path from 'node:path';
import { sql } from 'drizzle-orm';
import { createApp } from './app';
import { AnalyticsSessions } from './analytics/analytics-session';
import { Ga4Forwarder } from './analytics/ga4-forwarder';
import { ServerEvents, installServerEvents, questLabels } from './analytics/server-events';
import { loadConfig } from './config';
import { loadContentCatalog } from './content/content-catalog';
import { DEV_PGLITE_DIR, openPglite, openPostgres, type Db } from './db/client';
import { childProfiles, parents } from './db/schema';
import { CharacterEvents } from './character/character-events';
import { PlayerEvents } from './player/player-events';
import { dbFriendStore, type OnlineLookup } from './friend/friend-store';
import { BotRunner } from './multiplayer/bot-runner';
import { WalkStore } from './multiplayer/bot-brain/walk-store';
import { MultiplayerHub } from './multiplayer/multiplayer-hub';
import { dbMultiplayerStore, sessionAuthenticator, ticketAuthenticator } from './multiplayer/multiplayer-store';
import { OnlineSwitch } from './multiplayer/online-switch';
import { WsTickets } from './multiplayer/online-tickets';
import { startModerationJobs } from './moderation/moderation-jobs';
import { CoopService } from './coop/coop-service';
import { dbCoopRewards } from './reward/coop-reward';
import { dbBotStore } from './multiplayer/bot-store';
import { PartyQuestService, type PartyQuestHooks } from './coop/party-quest';

const config = loadConfig();
const pgliteDir = config.pgliteDir === null ? undefined : (config.pgliteDir ?? DEV_PGLITE_DIR);
// PG_VERSION is written when PGlite creates a data directory: its absence means a brand-new, empty database.
const freshPglite = !config.databaseUrl && pgliteDir !== undefined && !existsSync(path.join(pgliteDir, 'PG_VERSION'));
const database = config.databaseUrl ? await openPostgres(config.databaseUrl) : await openPglite(pgliteDir);
const { db } = database;
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
// Anonymous usage events for Google Analytics, sent from here only; without GA4_* set nothing is queued or sent.
const analyticsSink = new Ga4Forwarder({ config: config.ga4 });
const analyticsSessions = new AnalyticsSessions();
const usage = config.ga4 ? new ServerEvents({ sink: analyticsSink, sessions: analyticsSessions, labels: questLabels(content) }) : null;
installServerEvents(usage);
// The multiplayer connection opens with a one-use ticket the API hands out; the emergency switch is shared too.
const wsTickets = new WsTickets();
const onlineSwitch = new OnlineSwitch(config.onlineMode);
const app = createApp({ config, db, content, characterEvents, playerEvents, online, partyQuests, analytics: { sink: analyticsSink, sessions: analyticsSessions }, wsTickets, onlineSwitch });

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

const sessionAuth = sessionAuthenticator(db, config, content.consent.version, () => new Date());
const multiplayer = new MultiplayerHub(server, {
  store: dbMultiplayerStore(db),
  friends: dbFriendStore(db),
  authenticate: ticketAuthenticator(wsTickets, sessionAuth, config),
  revalidate: sessionAuth,
  allowedOrigins: config.allowedOrigins,
  onlineSwitch,
});
hub = multiplayer;
characterEvents.on((childId, character) => multiplayer.characterSaved(childId, character));
playerEvents.on((event) => multiplayer.playerEvent(event));
// Bots keep their own skills, the questions' anonymous numbers, whom they won with and what they learnt of each map.
const botStore = dbBotStore(db);
// They walk each map on its standing spots (content/world/walk/), read when a map's first bot comes in.
const botRunner = new BotRunner(multiplayer, { store: botStore, walk: new WalkStore() });
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
  store: botStore,
  subjectOf: (skill) => content.subjects.find((s) => s.skills.some((k) => k.id === skill))?.id ?? null,
});
multiplayer.setCoop(coop);
// Any lesson or story chapter played by a party: shared exploring, each member's own answers, team bosses.
partyQuestService = new PartyQuestService({ db, content, host: multiplayer.coopHost() });
multiplayer.setPartyQuests(partyQuestService);
console.log('multiplayer hub and companion bot runner active');
console.log(`online mode: ${onlineSwitch.mode}; moderators: ${config.moderatorAccounts.size}`);
// Incident logs kept 14 days, run-out locks, and the moderators' daily digest of new reports.
const stopModerationJobs = startModerationJobs({ db, moderators: config.moderatorAccounts });
console.log(`usage analytics: ${config.ga4 ? 'sent to Google Analytics' : 'off (GA4_MEASUREMENT_ID unset)'}`);

/** Every hour the most people online at once in it (companion bots never count) goes to the usage numbers. */
const CCU_PEAK_MS = 60 * 60_000;
if (usage) setInterval(() => usage.ccuPeak(multiplayer.takePeakPlayers()), CCU_PEAK_MS).unref();

/** Stopping (systemd sends SIGTERM on a restart or a release), the bots' memories are written out within this long. */
const SHUTDOWN_WRITE_MS = 3_000;
let stopping = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  // A second signal while writing: stop now.
  if (stopping) process.exit(1);
  stopping = true;
  console.log(`${signal}: writing out what the companion bots learnt`);
  botRunner.stop();
  stopModerationJobs();
  const timeout = new Promise<false>((resolve) => setTimeout(() => resolve(false), SHUTDOWN_WRITE_MS).unref());
  const written = (async (): Promise<true> => {
    // The usage events still queued leave too, within their own shorter deadline (`CLOSE_DEADLINE_MS`), so a slow
    // Google never keeps the database from closing.
    await Promise.all([botRunner.flush(), analyticsSink.close()]);
    await database.close();
    return true;
  })();
  const done = await Promise.race([written, timeout]).catch((err: unknown) => {
    console.error('shutdown failed', err instanceof Error ? err.name : typeof err);
    return false;
  });
  if (!done) console.warn(`companion bots' memories not all written within ${SHUTDOWN_WRITE_MS} ms`);
  process.exit(done ? 0 : 1);
}
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.on(signal, () => void shutdown(signal));
