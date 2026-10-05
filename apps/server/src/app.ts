import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import type { HealthResponse } from '@miu/schema/health';
import type { Worksheet } from '@miu/schema/worksheet';
import { accountRoutes } from './auth/account-routes';
import { loadSession } from './auth/auth-context';
import { authRoutes } from './auth/auth-routes';
import { googleAuthRoutes } from './auth/google-auth-routes';
import { requireAllowedOrigin } from './auth/origin-check';
import { HashQueueFullError } from './auth/secret-hashing';
import type { CharacterEvents } from './character/character-events';
import { characterRoutes } from './character/character-routes';
import { playerRoutes } from './player/player-routes';
import { progressRoutes } from './player/progress-routes';
import type { PlayerEvents } from './player/player-events';
import { playerSettingsRoutes } from './player/player-settings-routes';
import type { ServerConfig } from './config';
import { loadContentCatalog, type ContentCatalog } from './content/content-catalog';
import type { Db } from './db/client';
import { homeDecorRoutes, loadDecorCatalog } from './home/home-decor-routes';
import { HttpError } from './http-error';
import { playerPositionRoutes } from './player-position/player-position-routes';
import { questRoutes } from './quest/quest-routes';
import { collectionRoutes } from './collection/collection-routes';
import { loadRegionRewards } from './region-reward/region-reward-catalog';
import { regionRewardRoutes } from './region-reward/region-reward-routes';
import { loadShopCatalog } from './shop/shop-catalog';
import { shopRoutes } from './shop/shop-routes';
import { loadDefaultTimetable, timetableRoutes } from './timetable/timetable-routes';
import { loadWorksheets } from './worksheet/worksheet-builder';
import { worksheetRoutes } from './worksheet/worksheet-routes';
import { petCareRoutes } from './pet-care/pet-care-routes';
import { cookingRoutes } from './cooking/cooking-routes';
import { olympiadRoutes } from './olympiad/olympiad-routes';
import { mailRoutes } from './mail/mail-routes';
import { achievementRoutes } from './progression/achievement-routes';
import { journeyRoutes } from './progression/journey-routes';
import { skillTreeRoutes } from './progression/skill-tree-routes';

export interface AppDeps {
  config: ServerConfig;
  db: Db;
  /** Defaults to the repo `content/` directory. */
  content?: ContentCatalog;
  /** Printable worksheets by lesson id; defaults to the ones built from `content/curriculum`. */
  worksheets?: ReadonlyMap<string, Worksheet>;
  /** Injectable for tests (session expiry, parent-gate window). */
  clock?: () => Date;
  /** Google token endpoint call; tests inject a fake so Google is never contacted. */
  fetchImpl?: typeof fetch;
  /** Told when a player saves her character (the multiplayer hub redresses her for the others). */
  characterEvents?: CharacterEvents;
  /** Told when a player's switches, friends or blocks change (the multiplayer hub applies them at once). */
  playerEvents?: PlayerEvents;
}

/** Body-parser errors carry an HTTP status and a `type`; everything else is an internal error. */
function isClientError(err: unknown): err is { status: number; type?: string } {
  return typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number' && err.status < 500;
}

const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (err instanceof HashQueueFullError) {
    res.status(503).json({ error: 'server-busy' });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code });
    return;
  }
  if (isClientError(err)) {
    const code = err.type === 'entity.too.large' ? 'payload-too-large' : 'bad-request';
    res.status(err.status).json({ error: code });
    return;
  }
  // Never echo the error: messages and stacks can carry internals or personal data. Log the class only.
  console.error('unhandled error', err instanceof Error ? err.name : typeof err);
  res.status(500).json({ error: 'internal' });
};

/** Builds the Express app without listening, so tests can drive it through supertest. */
export function createApp({ config, db, content = loadContentCatalog(), worksheets = loadWorksheets(), clock = () => new Date(), fetchImpl, characterEvents, playerEvents }: AppDeps): express.Express {
  const app = express();
  app.disable('x-powered-by');
  // The API listens on loopback only and is reached through the web dev/preview proxy (or a reverse
  // proxy on the same host) that sets X-Forwarded-For; trusting loopback gives rate limits the client IP.
  app.set('trust proxy', 'loopback');
  app.use(helmet());
  app.use(express.json({ limit: '32kb' }));

  const api = express.Router();
  api.use(requireAllowedOrigin(config.allowedOrigins));
  api.use(loadSession(db, config, clock));
  api.get('/health', (_req, res) => {
    const body: HealthResponse = { status: 'ok' };
    res.json(body);
  });
  api.use(authRoutes({ db, config, content, clock }));
  api.use(googleAuthRoutes({ db, config, clock, fetchImpl }));
  api.use(accountRoutes({ db, config, clock }));
  api.use(playerRoutes({ db, content, clock }));
  api.use(progressRoutes({ db, content, clock }));
  api.use(playerSettingsRoutes({ db, content, clock, events: playerEvents }));
  api.use(characterRoutes({ db, content, events: characterEvents }));
  api.use(playerPositionRoutes({ db, content, clock }));
  api.use(questRoutes({ db, content, clock }));
  api.use(timetableRoutes({ db, content, clock, defaultTimetable: loadDefaultTimetable(config.timetableDefaultFile) }));
  const decor = loadDecorCatalog();
  const shop = loadShopCatalog(content.accessories, decor);
  api.use(homeDecorRoutes({ db, content, clock, catalog: decor, shop }));
  api.use(shopRoutes({ db, content, clock, shop }));
  api.use(regionRewardRoutes({ db, content, clock, rewards: loadRegionRewards(content.accessories) }));
  api.use(collectionRoutes({ db, content, clock }));
  api.use(petCareRoutes({ db, content, clock }));
  api.use(cookingRoutes({ db, content, clock }));
  api.use(olympiadRoutes({ db, content, clock }));
  api.use(mailRoutes({ db, content, clock }));
  api.use(skillTreeRoutes({ db, content }));
  api.use(journeyRoutes({ db, content, shopNames: new Map(shop.items.map((item) => [item.id, item.name])) }));
  api.use(achievementRoutes({ db, content, clock }));
  api.use(worksheetRoutes({ worksheets, clock, fontDir: config.handwritingFontDir }));
  app.use('/api', api);

  app.use((_req, res) => {
    res.status(404).json({ error: 'not-found' });
  });
  app.use(errorHandler);
  return app;
}
