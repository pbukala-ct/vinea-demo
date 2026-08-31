/**
 * 03 — load the transformed catalogue into commercetools.
 *
 * Idempotent: existence is checked in batched `where key in (...)` queries first, then only the
 * missing resources are created. Re-running is a cheap no-op rather than 1,000 failed POSTs.
 * Ends with a read-back verify.
 *
 * Run: npm run seed:catalogue   ·   fast subset: LIMIT=40 npm run seed:catalogue
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, ct, err, finish, pool, queryIn, all, ENV } from './lib/ct.ts';
import { LEAF_KEYS } from './data/taxonomy.ts';

const DATA = join(ROOT, 'data', 'catalogue');
const LIMIT = ENV.LIMIT ? Number(ENV.LIMIT) : 0;

let products: any[], prices: any[];
try {
  products = JSON.parse(readFileSync(join(DATA, 'products.json'), 'utf8'));
  prices = JSON.parse(readFileSync(join(DATA, 'prices.json'), 'utf8'));
} catch (e) {
  console.error(`FATAL: no catalogue at ${DATA} — run \`npm run transform:catalogue\` first.\n       ${(e as Error).message}`);
  process.exit(1);
}

if (LIMIT) {
  products = products.slice(0, LIMIT);
  const skus = new Set(products.map((p) => p.masterVariant.sku));
  prices = prices.filter((p) => skus.has(p.sku));
  console.log(`LIMIT=${LIMIT} → ${products.length} products, ${prices.length} prices`);
}

// ── products ──────────────────────────────────────────────────────────────────
async function seedProducts() {
  const existing = new Set((await queryIn('products', 'key', products.map((p) => p.key))).map((p: any) => p.key));
  const todo = products.filter((p) => !existing.has(p.key));
  console.log(`products: ${products.length} total, ${existing.size} present, ${todo.length} to create`);
  let done = 0;
  await pool(todo, 8, async (draft) => {
    const r = await ct('POST', '/products', draft);
    if (!r.ok) err(`product ${draft.key}`, r);
    if (++done % 100 === 0) console.log(`  … ${done}/${todo.length}`);
  });
  if (todo.length) console.log(`  created ${todo.length} product(s)`);
}

// ── standalone prices ─────────────────────────────────────────────────────────
async function seedPrices() {
  const existing = new Set((await queryIn('standalone-prices', 'key', prices.map((p) => p.key))).map((p: any) => p.key));
  const todo = prices.filter((p) => !existing.has(p.key));
  console.log(`prices: ${prices.length} total, ${existing.size} present, ${todo.length} to create`);
  let done = 0;
  await pool(todo, 8, async (draft) => {
    const r = await ct('POST', '/standalone-prices', draft);
    if (!r.ok) err(`price ${draft.key}`, r);
    if (++done % 100 === 0) console.log(`  … ${done}/${todo.length}`);
  });
}

// ── verify ────────────────────────────────────────────────────────────────────
async function verify() {
  console.log('\n── verify ──');
  const checks: [string, () => Promise<string | null>][] = [
    [`${products.length} products exist and are published`, async () => {
      const found = await queryIn('products', 'key', products.map((p) => p.key));
      if (found.length !== products.length) return `${found.length} found, want ${products.length}`;
      const unpublished = found.filter((p: any) => !p.masterData?.published);
      return unpublished.length ? `${unpublished.length} not published (e.g. ${unpublished[0].key})` : null;
    }],
    [`${prices.length} standalone prices in EUR`, async () => {
      const found = await queryIn('standalone-prices', 'key', prices.map((p) => p.key));
      if (found.length !== prices.length) return `${found.length} found, want ${prices.length}`;
      const wrong = found.filter((p: any) => p.value?.currencyCode !== 'EUR');
      return wrong.length ? `${wrong.length} not EUR` : null;
    }],
    ['was-price custom fields loaded', async () => {
      const want = prices.filter((p) => p.custom).length;
      if (!want) return null;
      const found = await queryIn('standalone-prices', 'key', prices.filter((p) => p.custom).map((p) => p.key));
      const withCustom = found.filter((p: any) => p.custom?.fields?.was_price?.centAmount > 0);
      return withCustom.length === want ? null : `${withCustom.length} of ${want} carry was_price`;
    }],
    ['every category leaf has products', async () => {
      if (LIMIT) return null; // meaningless on a subset load
      const cats = await all('categories');
      const byKey = new Map(cats.map((c: any) => [c.key, c]));
      const empty: string[] = [];
      for (const key of LEAF_KEYS) {
        const c = byKey.get(key);
        if (!c) { empty.push(`${key}(missing)`); continue; }
        const r = await ct('GET', `/product-projections?where=${encodeURIComponent(`categories(id="${c.id}")`)}&limit=0`);
        if (!r.ok || (r.body.total ?? 0) === 0) empty.push(key);
      }
      return empty.length ? `empty: ${empty.join(', ')}` : null;
    }],
    ['images resolve (sample of 5)', async () => {
      const sample = products.slice(0, 5).map((p) => p.masterVariant.images?.[0]?.url).filter(Boolean);
      const bad: string[] = [];
      for (const url of sample) {
        try {
          const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
          if (!res.ok) bad.push(`${res.status} ${url.split('/').pop()}`);
        } catch (e) {
          const cause = (e as any)?.cause?.code;
          bad.push(`${cause ?? (e as Error).name} ${url.split('/').pop()}`);
          if (cause === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY') {
            bad.push('→ TLS interception: set NODE_EXTRA_CA_CERTS (see .env.example)');
            break;
          }
        }
      }
      return bad.length ? bad.join(', ') : null;
    }],
  ];
  for (const [label, check] of checks) {
    const problem = await check();
    console.log(`  ${problem ? '✗' : '✓'} ${label}${problem ? ` — ${problem}` : ''}`);
    if (problem) err(`verify ${label}`, { ok: false, status: 0, body: { errors: [{ message: problem }] } });
  }
}

const t0 = Date.now();
await seedProducts();
await seedPrices();
await verify();
console.log(`\nelapsed ${((Date.now() - t0) / 1000).toFixed(1)}s`);
finish('catalogue');
