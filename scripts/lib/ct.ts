/**
 * Shared commercetools REST harness for the seed pipeline.
 *
 * Ported from metcash-demo's seed scripts, where this block was copy-pasted into every script —
 * here it lives once. Deliberately raw `fetch` rather than the TS SDK: seeds run as standalone
 * `node scripts/*.ts` with no build step and no dependency install.
 *
 * Everything retries on 429/5xx/network and re-auths once on 401, because a full seed makes
 * thousands of calls and commercetools will rate-limit a tight loop.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// ---- env ----
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  try {
    for (let line of readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')) {
      line = line.trim();
      if (!line || line.startsWith('#')) continue;
      if (line.startsWith('export ')) line = line.slice(7);
      const i = line.indexOf('=');
      if (i < 0) continue;
      const k = line.slice(0, i).trim();
      const v = line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
      // The repo-local file WINS for CTP_*: a sibling project's direnv/dotenv is often already
      // loaded in the shell, and inheriting it would seed the WRONG commercetools project.
      // Non-CTP vars still defer to the real environment so CI can override them.
      if (k.startsWith('CTP_') || !(k in process.env)) env[k] = v;
    }
  } catch { /* rely on process.env */ }
  return env;
}

export const ENV = loadEnv();

for (const k of ['CTP_PROJECT_KEY', 'CTP_CLIENT_ID', 'CTP_CLIENT_SECRET', 'CTP_AUTH_URL', 'CTP_API_URL']) {
  if (!ENV[k]) { console.error(`FATAL: ${k} is not set (see .env.example)`); process.exit(1); }
}

/**
 * Pinned in the repo, not the environment. Every seed aborts unless the resolved credentials
 * point here — the guard that stops a stray shell (or a sibling project's direnv) from writing
 * this demo's data into someone else's project. Override deliberately with ALLOW_PROJECT_OVERRIDE=1.
 */
export const EXPECTED_PROJECT_KEY = 'cave-bellevin-demo';

if (ENV.CTP_PROJECT_KEY !== EXPECTED_PROJECT_KEY && process.env.ALLOW_PROJECT_OVERRIDE !== '1') {
  console.error(
    `FATAL: refusing to run against project "${ENV.CTP_PROJECT_KEY}".\n` +
    `       This repo is pinned to "${EXPECTED_PROJECT_KEY}" (scripts/lib/ct.ts).\n` +
    `       Usually this means another project's env is loaded in your shell — run from\n` +
    `       ${ROOT} so .env.local is picked up, or set ALLOW_PROJECT_OVERRIDE=1 if you mean it.`,
  );
  process.exit(1);
}

export const PROJECT_KEY = ENV.CTP_PROJECT_KEY;
const API = `${ENV.CTP_API_URL}/${ENV.CTP_PROJECT_KEY}`;

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- auth ----
let token = '';
export async function auth(attempt = 1): Promise<void> {
  const basic = Buffer.from(`${ENV.CTP_CLIENT_ID}:${ENV.CTP_CLIENT_SECRET}`).toString('base64');
  try {
    const res = await fetch(`${ENV.CTP_AUTH_URL}/oauth/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
    });
    if (!res.ok) {
      if ((res.status === 429 || res.status >= 500) && attempt < 6) { await sleep(300 * 2 ** (attempt - 1)); return auth(attempt + 1); }
      throw new Error(`auth ${res.status}: ${await res.text()}`);
    }
    token = ((await res.json()) as { access_token: string }).access_token;
  } catch (e) {
    if (attempt < 6) { await sleep(300 * 2 ** (attempt - 1)); return auth(attempt + 1); }
    throw e;
  }
}

// ---- request ----
export interface CtResult<T = any> { ok: boolean; status: number; body: T }

export async function ct<T = any>(method: string, path: string, body?: unknown, attempt = 1): Promise<CtResult<T>> {
  if (!token) await auth();
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if ((res.status === 429 || res.status >= 500) && attempt < 5) { await sleep(250 * 2 ** (attempt - 1)); return ct(method, path, body, attempt + 1); }
    if (res.status === 401 && attempt < 5) { await auth(); return ct(method, path, body, attempt + 1); }
    const text = await res.text();
    let parsed: any;
    try { parsed = text ? JSON.parse(text) : undefined; } catch { parsed = text; }
    return { ok: res.ok, status: res.status, body: parsed };
  } catch (e) {
    if (attempt < 5) { await sleep(250 * 2 ** (attempt - 1)); return ct(method, path, body, attempt + 1); }
    return { ok: false, status: 0, body: { errors: [{ message: String((e as Error)?.message ?? e) }] } as any };
  }
}

/** GET a resource by key, or null on 404 (the upsert primitive). */
export async function getByKey<T = any>(resource: string, key: string): Promise<T | null> {
  const r = await ct<T>('GET', `/${resource}/key=${encodeURIComponent(key)}`);
  if (r.ok) return r.body;
  if (r.status === 404) return null;
  err(`GET ${resource}/${key}`, r);
  return null;
}

// ---- error collection ----
export const errors: string[] = [];

export function err(ctx: string, r: CtResult): void {
  const detail = r.body?.errors ? JSON.stringify(r.body.errors) : JSON.stringify(r.body).slice(0, 400);
  errors.push(`${ctx}: ${r.status} ${detail}`);
}

/** Print the error tally and exit non-zero if anything failed. Every script ends with this. */
export function finish(label: string): never {
  if (errors.length) {
    console.error(`\n✗ ${label}: ${errors.length} error(s)`);
    for (const e of errors.slice(0, 40)) console.error(`  - ${e}`);
    if (errors.length > 40) console.error(`  ... and ${errors.length - 40} more`);
    process.exit(1);
  }
  console.log(`\n✓ ${label}: OK`);
  process.exit(0);
}

// ---- concurrency + batching ----
export function chunk<T>(a: T[], n: number): T[][] {
  const o: T[][] = [];
  for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n));
  return o;
}

/** Bounded-concurrency map — what makes a full-catalogue load finish in minutes, not hours. */
export async function pool<T>(items: T[], limit: number, fn: (x: T, i: number) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; await fn(items[idx], idx); }
  }));
}

/** Batch existence lookup: fetch resources whose `field` is in `values` (chunked `where ... in`). */
export async function queryIn<T = any>(resource: string, field: string, values: string[], perChunk = 100): Promise<T[]> {
  const out: T[] = [];
  for (const c of chunk([...new Set(values)], perChunk)) {
    const list = c.map((v) => `"${v}"`).join(',');
    const r = await ct('GET', `/${resource}?where=${encodeURIComponent(`${field} in (${list})`)}&limit=500`);
    if (r.ok) out.push(...(r.body.results ?? [])); else err(`query ${resource}`, r);
  }
  return out;
}

/** Fetch every page of a resource (seeds are small; this is for verify + idempotency scans). */
export async function all<T = any>(resource: string, query = ''): Promise<T[]> {
  const out: T[] = [];
  let offset = 0;
  for (;;) {
    const sep = query ? '&' : '';
    const r = await ct('GET', `/${resource}?${query}${sep}limit=500&offset=${offset}`);
    if (!r.ok) { err(`list ${resource}`, r); return out; }
    out.push(...(r.body.results ?? []));
    if (out.length >= (r.body.total ?? 0) || !(r.body.results ?? []).length) return out;
    offset += 500;
  }
}

// ---- localised strings ----
/** Project locales. `en` carries demo content; `fr` is the slot for the French pass. */
export const LOCALE = 'en';
export const LOCALE_FR = 'fr';
export const l = (en: string, fr?: string): Record<string, string> =>
  fr ? { [LOCALE]: en, [LOCALE_FR]: fr } : { [LOCALE]: en };

/** EUR money in minor units. */
export const eur = (amount: number) => ({ currencyCode: 'EUR', centAmount: Math.round(amount * 100) });
