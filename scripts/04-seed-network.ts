/**
 * 04 — the retailer network: owners, channels, product selections, stores, per-store ranges,
 * per-store prices and per-store inventory.
 *
 * This is the phase that makes the opt-in model real. Everything derived from data/network.ts:
 *  - RANGE differs per store, chosen deterministically per category leaf with a per-store rotation
 *    offset, so stores genuinely stock different products AND no store has an empty category
 *    (an empty leaf would break the category nav).
 *  - PRICE differs per store: the national baseline shifted by the store's offset and re-snapped
 *    to a French retail price point, so switching store visibly moves every price.
 *  - INVENTORY differs per store, with a deliberate ~4% out-of-stock and ~8% low-stock so
 *    availability is something the UI actually has to handle.
 *
 * Idempotent: batched existence checks, create-only for what is missing. Ends with a verify.
 *
 * Run: npm run seed:network
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, ct, err, finish, pool, queryIn, all, l, ENV } from './lib/ct.ts';
import { LEAF_KEYS } from './data/taxonomy.ts';
import { STORES, OWNERS, priceChannelKey, supplyChannelKey, selectionKey, fulfilment, type StoreDef } from './data/network.ts';

const DATA = join(ROOT, 'data', 'catalogue');
const CONCURRENCY = Number(ENV.CONCURRENCY ?? 12);

const products: any[] = JSON.parse(readFileSync(join(DATA, 'products.json'), 'utf8'));
const nationalPrices: any[] = JSON.parse(readFileSync(join(DATA, 'prices.json'), 'utf8'));
const priceBySku = new Map(nationalPrices.map((p) => [p.sku, p.value.centAmount]));
/**
 * SKUs on promotion nationally, with their reference price.
 *
 * These have to be carried onto the per-store prices too. Price selection in a store context picks
 * the CHANNEL price, so a was_price that exists only on the national price is never seen by a
 * shopper — the strikethrough, the discount badge and the homepage's "coups de cœur" rail were all
 * silently dead in every store.
 */
const promoBySku = new Map<string, { was: number; promoId: string | null }>(
  nationalPrices
    .filter((p) => p.custom?.fields?.was_price)
    .map((p) => [p.sku, { was: p.custom.fields.was_price.centAmount, promoId: p.custom.fields.promo_id ?? null }]),
);

// ── deterministic helpers ─────────────────────────────────────────────────────
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
/**
 * Snap to a French retail price point. Deliberately a FINER grid (0.10 → always an x,x5 ending)
 * than the national baseline's 0.50: HQ publishes clean reference prices, retailers set their own
 * to the centime. On the 0.50 grid the 1-4% gaps between neighbouring stores collapsed onto the
 * same price and three stores showed an identical €9.95.
 */
const snapEur = (euros: number) => Math.max(0.95, Number((Math.round(euros * 10) / 10 - 0.05).toFixed(2)));

const productsByLeaf = new Map<string, any[]>();
for (const leaf of LEAF_KEYS) productsByLeaf.set(leaf, []);
for (const p of products) for (const c of p.categories) productsByLeaf.get(c.key)?.push(p);
for (const [, list] of productsByLeaf) list.sort((a, b) => a.key.localeCompare(b.key));

/**
 * The products a store ranges. Walks every leaf and takes `rangePct` of it starting at a
 * per-store rotation offset, so two stores at the same percentage still stock different wine.
 */
function rangeFor(store: StoreDef): any[] {
  if (store.rangePct <= 0) return [];
  const chosen = new Map<string, any>();
  const off = hash(store.key);
  for (const leaf of LEAF_KEYS) {
    const inLeaf = productsByLeaf.get(leaf) ?? [];
    if (!inLeaf.length) continue;
    const take = Math.min(inLeaf.length, Math.max(1, Math.ceil((inLeaf.length * store.rangePct) / 100)));
    const start = off % inLeaf.length;
    for (let i = 0; i < take; i++) {
      const p = inLeaf[(start + i) % inLeaf.length];
      chosen.set(p.key, p);
    }
  }
  return [...chosen.values()];
}

/** Deterministic stock level, with deliberate out-of-stock and low-stock tails. */
function stockFor(sku: string, storeKey: string): number {
  const h = hash(`${sku}|${storeKey}`);
  const r = h % 100;
  if (r < 4) return 0;                     // out of stock
  if (r < 12) return 1 + (h % 3);          // low stock
  return 8 + ((h >>> 8) % 45);             // >>> not >>: a signed shift went negative above 2^31
}

const RANGES = new Map(STORES.map((s) => [s.key, rangeFor(s)]));

// ── 1. owners (retailer-owners custom objects) ────────────────────────────────
async function seedOwners() {
  for (const o of OWNERS) {
    const { key, ...rest } = o;
    const value = { ...rest, stores: STORES.filter((s) => s.ownerKey === key).map((s) => s.key) };
    const r = await ct('POST', '/custom-objects', { container: 'retailer-owners', key, value });
    if (!r.ok) err(`owner ${key}`, r);
  }
  console.log(`owners: ${OWNERS.length} upserted`);
}

// ── 2. channels ───────────────────────────────────────────────────────────────
async function seedChannels() {
  const wanted = STORES.flatMap((s) => [
    { key: priceChannelKey(s.key),  roles: ['ProductDistribution'], name: `${s.name} — prix`,   store: s },
    { key: supplyChannelKey(s.key), roles: ['InventorySupply'],     name: `${s.name} — stock`,  store: s },
  ]);
  const existing = new Set((await queryIn('channels', 'key', wanted.map((c) => c.key))).map((c: any) => c.key));
  const todo = wanted.filter((c) => !existing.has(c.key));
  await pool(todo, CONCURRENCY, async (c) => {
    const r = await ct('POST', '/channels', {
      key: c.key,
      roles: c.roles,
      name: l(c.name),
      geoLocation: { type: 'Point', coordinates: [c.store.lon, c.store.lat] },
      address: { streetName: c.store.street, city: c.store.city, postalCode: c.store.postalCode, country: 'FR' },
    });
    if (!r.ok) err(`channel ${c.key}`, r);
  });
  console.log(`channels: ${wanted.length} total, ${todo.length} created`);
}

// ── 3. product selections ─────────────────────────────────────────────────────
async function seedSelections() {
  const wanted = STORES.map((s) => ({ key: selectionKey(s.key), name: `${s.name} — gamme` }));
  const existing = new Set((await queryIn('product-selections', 'key', wanted.map((x) => x.key))).map((x: any) => x.key));
  const todo = wanted.filter((x) => !existing.has(x.key));
  for (const x of todo) {
    const r = await ct('POST', '/product-selections', { key: x.key, name: l(x.name), mode: 'Individual' });
    if (!r.ok) err(`selection ${x.key}`, r);
  }
  console.log(`product-selections: ${wanted.length} total, ${todo.length} created`);
}

// ── 4. stores ─────────────────────────────────────────────────────────────────
async function seedStores() {
  const existing = new Map((await queryIn('stores', 'key', STORES.map((s) => s.key))).map((s: any) => [s.key, s]));
  let created = 0, updated = 0;
  for (const s of STORES) {
    const f = fulfilment(s);
    const fields: Record<string, unknown> = {
      banner: 'BELLEVIN',
      programme_tier: s.tier,
      lifecycle_state: s.lifecycle,
      opt_in_date: s.optInDate,
      owner_key: s.ownerKey,
      street_address: s.street,
      city: s.city,
      region: s.region,
      postal_code: s.postalCode,
      latitude: s.lat,
      longitude: s.lon,
      phone: s.phone,
      opening_hours: s.hours,
      click_collect_enabled: f.clickCollect,
      delivery_enabled: f.delivery,
      product_feed_ref: `feed://products/${s.key}`,
      pricing_feed_ref: `feed://pricing/${s.key}`,
      inventory_feed_ref: `feed://inventory/${s.key}`,
    };
    if (s.activationDate) fields.activation_date = s.activationDate;
    if (f.radiusKm !== null) fields.delivery_radius_km = f.radiusKm;
    if (f.timeslots !== null) fields.timeslot_capacity = f.timeslots;

    const draft = {
      key: s.key,
      name: l(s.name),
      languages: ['fr', 'en'],
      countries: [{ code: 'FR' }],
      distributionChannels: [{ typeId: 'channel', key: priceChannelKey(s.key) }],
      supplyChannels: [{ typeId: 'channel', key: supplyChannelKey(s.key) }],
      productSelections: [{ productSelection: { typeId: 'product-selection', key: selectionKey(s.key) }, active: s.lifecycle === 'ACTIVE' }],
      custom: { type: { typeId: 'type', key: 'store-programme' }, fields },
    };

    const have = existing.get(s.key);
    if (!have) {
      const r = await ct('POST', '/stores', draft);
      if (r.ok) created++; else err(`store ${s.key}`, r);
    } else {
      // keep the programme fields authoritative on re-run — this is the record the demo edits
      const r = await ct('POST', `/stores/key=${s.key}`, {
        version: have.version,
        actions: [{ action: 'setCustomType', type: { typeId: 'type', key: 'store-programme' }, fields }],
      });
      if (r.ok) updated++; else err(`store ${s.key} fields`, r);
    }
  }
  console.log(`stores: ${created} created, ${updated} refreshed`);
}

// ── 5. selection assignments ──────────────────────────────────────────────────
async function seedAssignments() {
  for (const s of STORES) {
    const key = selectionKey(s.key);
    const want = RANGES.get(s.key)!.map((p) => p.key);
    const assigned = new Set((await all(`product-selections/key=${key}/products`)).map((a: any) => a.product?.key ?? a.product?.id));
    const missing = want.filter((k) => !assigned.has(k));
    if (!missing.length) { console.log(`  ${s.key}: ${want.length} ranged (unchanged)`); continue; }

    // batch the addProduct actions — one update per 100 rather than one per product
    let sel = await ct('GET', `/product-selections/key=${key}`);
    let version = sel.body?.version;
    for (let i = 0; i < missing.length; i += 100) {
      const actions = missing.slice(i, i + 100).map((k) => ({ action: 'addProduct', product: { typeId: 'product', key: k } }));
      const r = await ct('POST', `/product-selections/key=${key}`, { version, actions });
      if (r.ok) version = r.body.version; else { err(`assign ${key} batch@${i}`, r); break; }
    }
    console.log(`  ${s.key}: ${want.length} ranged (+${missing.length})`);
  }
}

// ── 6. per-store prices ───────────────────────────────────────────────────────
async function seedStorePrices() {
  const drafts: any[] = [];
  for (const s of STORES) {
    for (const p of RANGES.get(s.key)!) {
      const sku = p.masterVariant.sku;
      const base = priceBySku.get(sku);
      if (base === undefined) continue;
      const euros = snapEur((base / 100) * (1 + s.priceOffsetPct / 100));
      const cents = Math.round(euros * 100);
      // carry the promotion through at the same relative discount, re-snapped for this store
      const promo = promoBySku.get(sku);
      const wasCents = promo ? Math.round(snapEur((promo.was / 100) * (1 + s.priceOffsetPct / 100)) * 100) : 0;
      const onPromo = !!promo && wasCents > cents;
      drafts.push({
        key: `${sku}__${s.key}`,
        sku,
        value: { currencyCode: 'EUR', centAmount: cents },
        channel: { typeId: 'channel', key: priceChannelKey(s.key) },
        ...(onPromo
          ? {
              custom: {
                type: { typeId: 'type', key: 'price-promo' },
                fields: {
                  was_price: { currencyCode: 'EUR', centAmount: wasCents },
                  ...(promo!.promoId ? { promo_id: promo!.promoId } : {}),
                },
              },
            }
          : {}),
      });
    }
  }
  const live = new Map((await queryIn('standalone-prices', 'key', drafts.map((d) => d.key))).map((p: any) => [p.key, p]));
  const create = drafts.filter((d) => !live.has(d.key));
  const update = drafts.filter((d) => {
    const l = live.get(d.key);
    if (!l) return false;
    const wantWas = d.custom?.fields?.was_price?.centAmount ?? null;
    const haveWas = l.custom?.fields?.was_price?.centAmount ?? null;
    return l.value?.centAmount !== d.value.centAmount || haveWas !== wantWas;
  });
  console.log(`store prices: ${drafts.length} total, ${create.length} to create, ${update.length} to correct`);
  let done = 0;
  await pool(create, CONCURRENCY, async (d) => {
    const r = await ct('POST', '/standalone-prices', d);
    if (!r.ok) err(`price ${d.key}`, r);
    if (++done % 500 === 0) console.log(`  … created ${done}/${create.length}`);
  });
  done = 0;
  await pool(update, CONCURRENCY, async (d) => {
    const l = live.get(d.key);
    const actions: Record<string, unknown>[] = [{ action: 'changeValue', value: d.value, staged: false }];
    if (d.custom) {
      actions.push({ action: 'setCustomType', type: d.custom.type, fields: d.custom.fields });
    } else if (l.custom) {
      actions.push({ action: 'setCustomType' }); // clears the promo when it no longer applies
    }
    const r = await ct('POST', `/standalone-prices/key=${d.key}`, { version: l.version, actions });
    if (!r.ok) err(`price update ${d.key}`, r);
    if (++done % 500 === 0) console.log(`  … corrected ${done}/${update.length}`);
  });
}

// ── 7. per-store inventory ────────────────────────────────────────────────────
async function seedInventory() {
  const drafts: any[] = [];
  for (const s of STORES) {
    for (const p of RANGES.get(s.key)!) {
      const sku = p.masterVariant.sku;
      drafts.push({
        key: `${sku}__${s.key}`,
        sku,
        supplyChannel: { typeId: 'channel', key: supplyChannelKey(s.key) },
        quantityOnStock: stockFor(sku, s.key),
        restockableInDays: 3,
      });
    }
  }
  const live = new Map((await queryIn('inventory', 'key', drafts.map((d) => d.key))).map((i: any) => [i.key, i]));
  const create = drafts.filter((d) => !live.has(d.key));
  const update = drafts.filter((d) => {
    const l = live.get(d.key);
    return l && l.quantityOnStock !== d.quantityOnStock;
  });
  console.log(`inventory: ${drafts.length} total, ${create.length} to create, ${update.length} to correct`);
  let done = 0;
  await pool(create, CONCURRENCY, async (d) => {
    const r = await ct('POST', '/inventory', d);
    if (!r.ok) err(`inventory ${d.key}`, r);
    if (++done % 500 === 0) console.log(`  … created ${done}/${create.length}`);
  });
  done = 0;
  await pool(update, CONCURRENCY, async (d) => {
    const l = live.get(d.key);
    const r = await ct('POST', `/inventory/key=${d.key}`, {
      version: l.version, actions: [{ action: 'changeQuantity', quantity: d.quantityOnStock }],
    });
    if (!r.ok) err(`inventory update ${d.key}`, r);
    if (++done % 500 === 0) console.log(`  … corrected ${done}/${update.length}`);
  });
}

// ── verify ────────────────────────────────────────────────────────────────────
async function verify() {
  console.log('\n── verify ──');
  const checks: [string, () => Promise<string | null>][] = [
    ['8 stores with programme fields', async () => {
      const found = await queryIn('stores', 'key', STORES.map((s) => s.key));
      if (found.length !== STORES.length) return `${found.length} found, want ${STORES.length}`;
      for (const s of STORES) {
        const live: any = found.find((x: any) => x.key === s.key);
        const f = live.custom?.fields;
        if (!f) return `${s.key} has no custom fields`;
        if (f.programme_tier !== s.tier) return `${s.key} tier ${f.programme_tier}, want ${s.tier}`;
        if (f.lifecycle_state !== s.lifecycle) return `${s.key} lifecycle ${f.lifecycle_state}, want ${s.lifecycle}`;
        if (f.owner_key !== s.ownerKey) return `${s.key} owner ${f.owner_key}, want ${s.ownerKey}`;
        if (f.region !== s.region) return `${s.key} region ${f.region}, want ${s.region}`;
      }
      return null;
    }],
    ['16 channels + 8 selections wired to stores', async () => {
      const chans = await queryIn('channels', 'key', STORES.flatMap((s) => [priceChannelKey(s.key), supplyChannelKey(s.key)]));
      if (chans.length !== 16) return `${chans.length} channels, want 16`;
      const found = await queryIn('stores', 'key', STORES.map((s) => s.key));
      for (const s of STORES) {
        const live: any = found.find((x: any) => x.key === s.key);
        if (!live.distributionChannels?.length) return `${s.key} has no distribution channel`;
        if (!live.supplyChannels?.length) return `${s.key} has no supply channel`;
        const sel = live.productSelections?.[0];
        if (!sel) return `${s.key} has no product selection`;
        const wantActive = s.lifecycle === 'ACTIVE';
        if (sel.active !== wantActive) return `${s.key} selection active=${sel.active}, want ${wantActive}`;
      }
      return null;
    }],
    ['ranges differ per store and match the plan', async () => {
      for (const s of STORES) {
        const want = RANGES.get(s.key)!.length;
        const r = await ct('GET', `/product-selections/key=${selectionKey(s.key)}`);
        const actual = r.ok ? (r.body.productCount ?? 0) : -1;
        if (actual !== want) return `${s.key} ranges ${actual}, want ${want}`;
      }
      const sizes = STORES.map((s) => RANGES.get(s.key)!.length);
      return new Set(sizes).size > 1 ? null : 'every store has the same range size';
    }],
    ['no ACTIVE store has an empty category leaf', async () => {
      // an empty leaf would render a dead link in the category nav
      const active = STORES.filter((s) => s.lifecycle === 'ACTIVE');
      for (const s of active) {
        const ranged = new Set(RANGES.get(s.key)!.map((p) => p.key));
        for (const leaf of LEAF_KEYS) {
          const inLeaf = productsByLeaf.get(leaf) ?? [];
          if (inLeaf.length && !inLeaf.some((p) => ranged.has(p.key))) return `${s.key} has nothing in ${leaf}`;
        }
      }
      return null;
    }],
    ['per-store prices exist and differ between stores', async () => {
      const paris = 'bellevin-paris-batignolles', nantes = 'bellevin-nantes-graslin';
      const shared = RANGES.get(paris)!.filter((p) => RANGES.get(nantes)!.some((q) => q.key === p.key)).slice(0, 20);
      if (!shared.length) return 'Paris and Nantes share no products to compare';
      const keys = shared.flatMap((p) => [`${p.masterVariant.sku}__${paris}`, `${p.masterVariant.sku}__${nantes}`]);
      const found = await queryIn('standalone-prices', 'key', keys);
      if (found.length !== keys.length) return `${found.length} of ${keys.length} store prices found`;
      const byKey = new Map(found.map((p: any) => [p.key, p.value.centAmount]));
      let differing = 0;
      for (const p of shared) {
        const a = byKey.get(`${p.masterVariant.sku}__${paris}`), b = byKey.get(`${p.masterVariant.sku}__${nantes}`);
        if (a !== b) differing++;
      }
      return differing >= shared.length * 0.8 ? null : `only ${differing}/${shared.length} prices differ Paris vs Nantes`;
    }],
    ['no two ACTIVE stores share an identical price list', async () => {
      const active = STORES.filter((s) => s.lifecycle === 'ACTIVE');
      const lists = new Map<string, string>();
      for (const s of active) {
        const sample = RANGES.get(s.key)!.slice(0, 40).map((p) => `${p.masterVariant.sku}__${s.key}`);
        const found = await queryIn('standalone-prices', 'key', sample);
        const byKey = new Map(found.map((p: any) => [p.key, p.value.centAmount]));
        const sig = sample.map((k) => byKey.get(k) ?? 'x').join(',');
        const clash = [...lists.entries()].find(([, v]) => v === sig);
        if (clash) return `${s.key} has the same prices as ${clash[0]}`;
        lists.set(s.key, sig);
      }
      return null;
    }],
    ['promotions reach the per-store prices', async () => {
      const promoSkus = [...promoBySku.keys()];
      if (!promoSkus.length) return null;
      for (const s of STORES.filter((x) => x.rangePct > 0)) {
        const ranged = new Set(RANGES.get(s.key)!.map((p) => p.masterVariant.sku));
        const keys = promoSkus.filter((sku) => ranged.has(sku)).map((sku) => `${sku}__${s.key}`);
        if (!keys.length) continue;
        const found = await queryIn('standalone-prices', 'key', keys);
        const withWas = found.filter((p: any) => p.custom?.fields?.was_price?.centAmount > p.value.centAmount);
        if (!withWas.length) return `${s.key} has ${keys.length} promo skus ranged but none carry a was_price`;
      }
      return null;
    }],
    ['inventory loaded with out-of-stock and low-stock tails', async () => {
      const sample = STORES.filter((s) => s.rangePct > 0).flatMap((s) => RANGES.get(s.key)!.slice(0, 60).map((p) => `${p.masterVariant.sku}__${s.key}`));
      const found = await queryIn('inventory', 'key', sample);
      if (found.length !== sample.length) return `${found.length} of ${sample.length} inventory entries found`;
      const negative = found.filter((i: any) => i.quantityOnStock < 0);
      if (negative.length) return `${negative.length} entries have NEGATIVE stock (e.g. ${negative[0].key} = ${negative[0].quantityOnStock})`;
      const oos = found.filter((i: any) => i.quantityOnStock === 0).length;
      const low = found.filter((i: any) => i.quantityOnStock > 0 && i.quantityOnStock <= 3).length;
      if (!oos) return 'no out-of-stock entries — availability handling is untestable';
      if (!low) return 'no low-stock entries';
      return null;
    }],
    ['4 owners, each holding the right stores', async () => {
      const objs = await all('custom-objects/retailer-owners');
      if (objs.length !== OWNERS.length) return `${objs.length} owners, want ${OWNERS.length}`;
      for (const o of OWNERS) {
        const live: any = objs.find((x: any) => x.key === o.key);
        if (!live) return `${o.key} missing`;
        const want = STORES.filter((s) => s.ownerKey === o.key).map((s) => s.key).sort().join(',');
        const got = (live.value.stores ?? []).slice().sort().join(',');
        if (got !== want) return `${o.key} stores ${got}, want ${want}`;
      }
      const multi = OWNERS.filter((o) => STORES.filter((s) => s.ownerKey === o.key).length > 1);
      return multi.length >= 2 ? null : 'fewer than 2 multi-store owners — franchise story is weak';
    }],
    ['Toulouse is DRAFT, not trading', async () => {
      const s: any = (await queryIn('stores', 'key', ['bellevin-toulouse-carmes']))[0];
      if (!s) return 'missing';
      if (s.custom?.fields?.lifecycle_state !== 'DRAFT') return `lifecycle ${s.custom?.fields?.lifecycle_state}`;
      if (s.custom?.fields?.activation_date) return 'has an activation_date but is DRAFT';
      if (s.productSelections?.[0]?.active !== false) return 'its product selection is active';
      const r = await ct('GET', `/product-selections/key=${selectionKey('bellevin-toulouse-carmes')}`);
      return (r.body?.productCount ?? -1) === 0 ? null : `ranges ${r.body?.productCount} products, want 0`;
    }],
  ];
  for (const [label, check] of checks) {
    const problem = await check();
    console.log(`  ${problem ? '✗' : '✓'} ${label}${problem ? ` — ${problem}` : ''}`);
    if (problem) err(`verify ${label}`, { ok: false, status: 0, body: { errors: [{ message: problem }] } });
  }
}

const t0 = Date.now();
console.log('planned ranges: ' + STORES.map((s) => `${s.city}=${RANGES.get(s.key)!.length}`).join('  '));
await seedOwners();
await seedChannels();
await seedSelections();
await seedStores();
console.log('assignments:');
await seedAssignments();
await seedStorePrices();
await seedInventory();
await verify();
console.log(`\nelapsed ${((Date.now() - t0) / 1000).toFixed(1)}s`);
finish('network');
