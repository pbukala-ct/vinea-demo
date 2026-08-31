import 'server-only';
import { createApiBuilderFromCtpClient } from '@commercetools/platform-sdk';
import { ClientBuilder } from '@commercetools/ts-client';
import { ctpEnv, requireCtpEnv } from './env';

/**
 * BFF only — this module is server-only, so credentials never reach the browser.
 * One ClientBuilder singleton per process: instantiating per request exhausts the token endpoint.
 */

/**
 * Backstop guard. lib/ct/env.ts already makes .env.local authoritative for CTP_*, so this should
 * never fire in this repo — it exists so that a genuinely misconfigured deployment fails at boot
 * with a clear message instead of quietly serving another project's catalogue.
 */
const EXPECTED_PROJECT_KEY = 'cave-bellevin-demo';

const projectKey = requireCtpEnv('CTP_PROJECT_KEY');

if (projectKey !== EXPECTED_PROJECT_KEY && ctpEnv('ALLOW_PROJECT_OVERRIDE') !== '1') {
  throw new Error(
    `Refusing to start against commercetools project "${projectKey}".\n` +
    `This storefront is pinned to "${EXPECTED_PROJECT_KEY}" (site/lib/ct/client.ts).\n` +
    `Set ALLOW_PROJECT_OVERRIDE=1 to override deliberately.`,
  );
}

function buildClient() {
  return new ClientBuilder()
    .withProjectKey(projectKey)
    .withClientCredentialsFlow({
      host: requireCtpEnv('CTP_AUTH_URL'),
      projectKey,
      credentials: {
        clientId: requireCtpEnv('CTP_CLIENT_ID'),
        clientSecret: requireCtpEnv('CTP_CLIENT_SECRET'),
      },
    })
    .withHttpMiddleware({
      host: requireCtpEnv('CTP_API_URL'),
      /**
       * Opt commercetools calls out of Next's Data Cache.
       *
       * Every response here is store-scoped and request-scoped, so there is nothing to gain from
       * caching it between requests, and a stale store/tier read would be actively wrong. React's
       * `cache()` still de-duplicates within a single render.
       *
       * NOTE: this is hygiene, not a fix for range changes taking ~30s to appear on the PLP — that
       * is commercetools' Product Search index being eventually consistent, measured below. Framework
       * caching was ruled out by comparing selection.productCount (instant) with products/search.
       */
      httpClient: (url: string, options: RequestInit) =>
        fetch(url, { ...options, cache: 'no-store' }),
    })
    .build();
}

export const apiRoot = createApiBuilderFromCtpClient(buildClient()).withProjectKey({ projectKey });
