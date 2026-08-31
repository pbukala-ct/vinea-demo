/**
 * 05 — order history, so the retailer dashboard has something real to aggregate.
 *
 * Uses the Order IMPORT endpoint rather than cart→order, because import is the only way to set
 * `completedAt`: `createdAt` is server-assigned, so a cart-built order is always "today" and a
 * 60-day trend chart is impossible. The dashboard buckets on `completedAt ?? createdAt`.
 *
 * Orders are built from each store's REAL ranged SKUs and REAL channel prices (read back from
 * commercetools, not recomputed), so revenue figures reconcile with the catalogue.
 *
 * Deterministic: a seeded RNG per store and stable order numbers, so re-running creates nothing new.
 *
 * Run: npm run seed:orders   ·   smaller: ORDERS_PER_STORE=5 npm run seed:orders
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, ct, err, finish, pool, queryIn, all, ENV } from './lib/ct.ts';
import { STORES, priceChannelKey } from './data/network.ts';

const products: any[] = JSON.parse(readFileSync(join(ROOT, 'data', 'catalogue', 'products.json'), 'utf8'));
const nameBySku = new Map<string, string>(products.map((p) => [p.masterVariant.sku, p.name.en]));

const DAYS = 60;
const PER_STORE = Number(ENV.ORDERS_PER_STORE ?? 0);

/** Deterministic RNG — same history on every run, so the demo never shifts under you. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedOf(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

const FIRST = ['Camille', 'Théo', 'Hélène', 'Anaïs', 'Lucas', 'Chloé', 'Mathieu', 'Léa', 'Antoine', 'Sarah', 'Julien', 'Manon', 'Nicolas', 'Émilie', 'Paul', 'Clara'];
const LAST = ['Rousseau', 'Bernard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Michel', 'Garcia', 'Roux', 'Fournier', 'Girard', 'Bonnet', 'Dupont', 'Lambert'];

/** Orders per store, scaled by how much the store ranges — a bigger cave sells more. */
function volumeFor(rangePct: number): number {
  if (PER_STORE) return PER_STORE;
  if (rangePct >= 100) return 34;
  if (rangePct >= 60) return 22;
  return 12;
}

interface StorePrice { sku: string; cents: number }

/**
 * A store's ranged SKUs with their real channel prices.
 * Filtered by channel ID, not key: on a StandalonePrice `channel` is a plain Reference exposing
 * only `id`/`typeId`, so `channel(key="…")` is a 400.
 */
async function pricesFor(chanId: string): Promise<StorePrice[]> {
  const rows = await all('standalone-prices', `where=${encodeURIComponent(`channel(id="${chanId}")`)}`);
  return rows
    .map((p: any) => ({ sku: p.sku as string, cents: p.value.centAmount as number }))
    .filter((p) => nameBySku.has(p.sku));
}

function buildOrders(store: typeof STORES[number], prices: StorePrice[], chanId: string) {
  const rnd = mulberry32(seedOf(store.key));
  const count = volumeFor(store.rangePct);
  const now = Date.now();
  const drafts: any[] = [];

  for (let i = 0; i < count; i++) {
    // spread across DAYS, weighted toward weekends — a caviste's real rhythm
    let dayOffset = Math.floor(rnd() * DAYS);
    const when = new Date(now - dayOffset * 86400000);
    const dow = when.getUTCDay();
    if (dow !== 5 && dow !== 6 && rnd() < 0.35) { dayOffset = Math.max(0, dayOffset - ((dow + 2) % 7)); }
    const completedAt = new Date(now - dayOffset * 86400000);
    completedAt.setUTCHours(9 + Math.floor(rnd() * 10), Math.floor(rnd() * 60), 0, 0);

    const lineCount = 1 + Math.floor(rnd() * 4);
    const picked = new Map<string, number>();
    for (let l = 0; l < lineCount; l++) {
      const p = prices[Math.floor(rnd() * prices.length)];
      if (p) picked.set(p.sku, (picked.get(p.sku) ?? 0) + 1 + Math.floor(rnd() * 2));
    }
    if (!picked.size) continue;

    const lineItems = [...picked.entries()].map(([sku, quantity]) => {
      const cents = prices.find((p) => p.sku === sku)!.cents;
      return {
        name: { en: nameBySku.get(sku)! },
        variant: { sku },
        quantity,
        price: { value: { currencyCode: 'EUR', centAmount: cents } },
        distributionChannel: { typeId: 'channel', id: chanId },
      };
    });
    const itemsTotal = lineItems.reduce((n, l) => n + l.price.value.centAmount * l.quantity, 0);

    // fulfilment follows what the store's tier actually offers
    const canDeliver = store.tier === 'PREMIUM';
    const delivery = canDeliver && rnd() < 0.45;
    const shippingCents = delivery ? (itemsTotal >= 15000 ? 0 : 690) : 0;

    const first = FIRST[Math.floor(rnd() * FIRST.length)];
    const last = LAST[Math.floor(rnd() * LAST.length)];
    const r = rnd();
    const state = r < 0.78 ? 'Complete' : r < 0.9 ? 'Confirmed' : r < 0.96 ? 'Open' : 'Cancelled';

    drafts.push({
      orderNumber: `CB-${store.postalCode}-${String(i + 1).padStart(3, '0')}`,
      customerEmail: `${first.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}.${last.toLowerCase()}@example.fr`,
      store: { typeId: 'store', key: store.key },
      country: 'FR',
      totalPrice: { currencyCode: 'EUR', centAmount: itemsTotal + shippingCents },
      orderState: state,
      ...(state === 'Complete' ? { shipmentState: 'Shipped', paymentState: 'Paid' } : {}),
      ...(state === 'Confirmed' ? { paymentState: 'Paid' } : {}),
      completedAt: completedAt.toISOString(),
      shippingAddress: delivery
        ? { firstName: first, lastName: last, streetName: `${1 + Math.floor(rnd() * 90)} rue de la République`, postalCode: store.postalCode, city: store.city, country: 'FR' }
        : { firstName: first, lastName: last, streetName: store.street, postalCode: store.postalCode, city: store.city, country: 'FR' },
      lineItems,
    });
  }
  return drafts;
}

// ── run ───────────────────────────────────────────────────────────────────────
const t0 = Date.now();
const active = STORES.filter((s) => s.lifecycle === 'ACTIVE');
const allDrafts: any[] = [];

for (const store of active) {
  const chan = await ct('GET', `/channels/key=${priceChannelKey(store.key)}`);
  if (!chan.ok) { err(`channel ${store.key}`, chan); continue; }
  const prices = await pricesFor(chan.body.id);
  if (!prices.length) { console.log(`  ${store.key}: no store prices, skipped`); continue; }
  const drafts = buildOrders(store, prices, chan.body.id);
  allDrafts.push(...drafts);
  console.log(`  ${store.city.padEnd(11)} ${String(drafts.length).padStart(3)} orders planned from ${prices.length} ranged skus`);
}

const existing = new Set(
  (await queryIn('orders', 'orderNumber', allDrafts.map((d) => d.orderNumber))).map((o: any) => o.orderNumber),
);
const todo = allDrafts.filter((d) => !existing.has(d.orderNumber));
console.log(`\norders: ${allDrafts.length} total, ${existing.size} present, ${todo.length} to import`);

let done = 0;
await pool(todo, 8, async (draft) => {
  const r = await ct('POST', '/orders/import', draft);
  if (!r.ok) err(`order ${draft.orderNumber}`, r);
  if (++done % 40 === 0) console.log(`  … ${done}/${todo.length}`);
});

// ── verify ────────────────────────────────────────────────────────────────────
console.log('\n── verify ──');
const checks: [string, () => Promise<string | null>][] = [
  ['every active store has orders', async () => {
    for (const s of active) {
      const r = await ct('GET', `/orders?where=${encodeURIComponent(`store(key="${s.key}")`)}&limit=0`);
      if (!r.ok) return `query failed for ${s.key}`;
      if ((r.body.total ?? 0) === 0) return `${s.key} has no orders`;
    }
    return null;
  }],
  ['orders are spread over the last 60 days', async () => {
    const rows = await all('orders', 'sort=completedAt asc');
    const dated = rows.filter((o: any) => o.completedAt);
    if (dated.length < 50) return `only ${dated.length} orders carry completedAt`;
    const days = new Set(dated.map((o: any) => o.completedAt.slice(0, 10)));
    return days.size >= 25 ? null : `only ${days.size} distinct days`;
  }],
  ['a mix of order states', async () => {
    const rows = await all('orders');
    const states = new Set(rows.map((o: any) => o.orderState));
    return states.size >= 3 ? null : `only states: ${[...states].join(', ')}`;
  }],
  ['no order leaks across stores', async () => {
    const rows = await all('orders');
    const bad = rows.filter((o: any) => o.orderNumber?.startsWith('CB-') && !o.store?.key);
    return bad.length ? `${bad.length} seeded orders have no store` : null;
  }],
];
for (const [label, check] of checks) {
  const problem = await check();
  console.log(`  ${problem ? '✗' : '✓'} ${label}${problem ? ` — ${problem}` : ''}`);
  if (problem) err(`verify ${label}`, { ok: false, status: 0, body: { errors: [{ message: problem }] } });
}
console.log(`\nelapsed ${((Date.now() - t0) / 1000).toFixed(1)}s`);
finish('orders');
