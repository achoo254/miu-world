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
import { characterRoutes } from './character/character-routes';
import { childProfileRoutes } from './child-profile/child-profile-routes';
import type { ServerConfig } from './config';
import { loadContentCatalog, type ContentCatalog } from './content/content-catalog';
import type { Db } from './db/client';
import { HttpError } from './http-error';
import { playerPositionRoutes } from './player-position/player-position-routes';
import { questRoutes } from './quest/quest-routes';
import { loadWorksheets } from './worksheet/worksheet-builder';
import { worksheetRoutes } from './worksheet/worksheet-routes';

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
export function createApp({ config, db, content = loadContentCatalog(), worksheets = loadWorksheets(), clock = () => new Date(), fetchImpl }: AppDeps): express.Express {
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
  api.use(childProfileRoutes({ db, content, clock }));
  api.use(characterRoutes({ db, content }));
  api.use(playerPositionRoutes({ db, content, clock }));
  api.use(questRoutes({ db, content, clock }));
  api.use(worksheetRoutes({ worksheets, clock, fontDir: config.handwritingFontDir }));
  app.use('/api', api);

  app.use((_req, res) => {
    res.status(404).json({ error: 'not-found' });
  });
  app.use(errorHandler);
  return app;
}
