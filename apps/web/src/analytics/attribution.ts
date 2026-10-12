// Where this visit came from: the `utm_*` labels of the link it opened and the referring site's domain, read once
// when the visit starts (before any redirect drops the query) and kept in sessionStorage for the visit's page views.
// Only short checked labels and a domain: never the full referring URL or any other query value.
import { ATTRIBUTION_VALUE, referrerDomain } from '@miu/schema/analytics';

const KEY = 'miu.ga.source';

export interface Attribution {
  source?: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
}

let memory: Attribution | null = null;

function parseStored(raw: string | null): Attribution | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const out: Attribution = {};
    for (const key of ['source', 'medium', 'campaign'] as const) {
      const label: unknown = (value as Record<string, unknown>)[key];
      if (typeof label === 'string' && ATTRIBUTION_VALUE.test(label)) out[key] = label;
    }
    const referrer: unknown = (value as Record<string, unknown>).referrer;
    if (typeof referrer === 'string' && referrerDomain(referrer)) out.referrer = referrer;
    return out;
  } catch {
    return null;
  }
}

/** The visit's source read from the address and the referrer (`location`, `document.referrer` by default). */
export function readAttribution(search: string, referrer: string, ownHost: string): Attribution {
  const query = new URLSearchParams(search);
  const out: Attribution = {};
  for (const [key, param] of [['source', 'utm_source'], ['medium', 'utm_medium'], ['campaign', 'utm_campaign']] as const) {
    const label = query.get(param)?.trim().toLowerCase();
    if (label && ATTRIBUTION_VALUE.test(label)) out[key] = label;
  }
  const domain = referrer ? referrerDomain(referrer) : null;
  // Moving between Miu's own pages is not a source.
  if (domain && domain !== ownHost.toLowerCase()) out.referrer = domain;
  return out;
}

/** The source of this visit (this tab), recorded the first time it is asked for. */
export function visitAttribution(): Attribution {
  if (memory) return memory;
  let stored: Attribution | null = null;
  try {
    stored = parseStored(window.sessionStorage.getItem(KEY));
  } catch {
    // Blocked storage: read from the address below and kept in memory.
  }
  if (stored) {
    memory = stored;
    return stored;
  }
  const found = readAttribution(window.location.search, document.referrer, window.location.hostname);
  memory = found;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(found));
  } catch {
    // Blocked storage: kept in memory for this page.
  }
  return found;
}

/** Forgets the in-memory source (tests). */
export function resetAttributionForTest(): void {
  memory = null;
}
