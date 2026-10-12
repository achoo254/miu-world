// Dev check of the events' shape against Google's validation endpoint (`/debug/mp/collect`, which records nothing):
//   pnpm --filter @miu/server exec tsx --env-file=<file with GA4_MEASUREMENT_ID and GA4_API_SECRET> src/analytics/ga4-debug.ts
// Builds one event of each kind the way the server does (web events through the same checks, server events through
// `ServerEvents`) and prints Google's validation messages. Prints no secret.
import { sanitizeWebEvent, type Ga4Hit } from '@miu/schema/analytics';
import { loadConfig } from '../config';
import { loadContentCatalog } from '../content/content-catalog';
import { AnalyticsSessions } from './analytics-session';
import { analyticsCatalog } from './analytics-routes';
import { Ga4Forwarder } from './ga4-forwarder';
import { ServerEvents, questLabels, randomGaIds } from './server-events';

const config = loadConfig();
if (!config.ga4) {
  console.error('GA4_MEASUREMENT_ID and GA4_API_SECRET are not set: nothing to check');
  process.exit(1);
}
const content = loadContentCatalog();
const catalog = analyticsCatalog(content);
const ids = randomGaIds(Date.now());
const hits: Ga4Hit[] = [];
const web = { client_id: ids.clientId, session_id: ids.sessionId };
for (const body of [
  { ...web, name: 'page_view', path: '/play', source: 'share', medium: 'zalo', campaign: 'result', referrer: 'zalo.me' },
  { ...web, name: 'share', path: '/play', method: 'copy-link', content_type: 'result' },
]) {
  const result = sanitizeWebEvent(body, 'https://miu.hoandat.com', catalog);
  if (result.ok) hits.push(result.hit);
}
const sessions = new AnalyticsSessions();
sessions.remember('debug', ids, { parentId: 'debug', childId: 'debug' });
const events = new ServerEvents({ sink: { send: (hit) => hits.push({ ...hit, clientId: ids.clientId }) }, sessions, labels: questLabels(content) });
events.signUp('debug', 'google');
const quest = [...content.quests.values()].find((q) => q.status === 'active' && q.lesson);
if (quest?.status === 'active') events.questFinished('debug', quest, true);
events.ccuPeak(3);

const forwarder = new Ga4Forwarder({ config: config.ga4 });
try {
  console.log(`checking ${hits.length} events: ${hits.map((h) => h.event.name).join(', ')}`);
  console.log(JSON.stringify(await forwarder.validate(hits), null, 2));
} catch (err) {
  console.error('validation request failed', err instanceof Error ? err.name : typeof err);
  process.exitCode = 1;
}
