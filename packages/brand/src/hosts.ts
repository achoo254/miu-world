// Copied from chat-next/packages/brand @a5be0b4; keep in sync until shared package exists.
// Miu serves one host per tenant: no Bot API, webhooks or Mini Apps.
import type { BrandConfig } from './brand.ts';

/** The hosts one tenant serves the app from. */
export interface TenantHosts {
  readonly web: string;
}

function fill(template: string, domain: string): string {
  return template.replace('{domain}', domain);
}

export function hostsFor(brand: BrandConfig, domain: string): TenantHosts {
  return { web: fill(brand.hostTemplates.web, domain) };
}

/** `https://<web host>` of the primary tenant: where the game is served and every absolute address points. */
export function primaryOrigin(brand: BrandConfig): string {
  return `https://${hostsFor(brand, brand.primaryTenant.domain).web}`;
}
