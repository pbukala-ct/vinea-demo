/**
 * 01 — data model.
 *
 * Ports the Metcash demo's `liquor` product type and `store-programme` custom type with the
 * Australian-isms replaced (see the table in CLAUDE.md), then seeds the category tree, the
 * `programme-tiers` governance templates, and the commerce primitives checkout needs
 * (tax category, zone, shipping methods).
 *
 * Idempotent throughout: create-if-absent, and ADDITIVE for type definitions — re-running never
 * destroys an attribute that already holds data. Ends with a read-back verify.
 *
 * Run: npm run seed:model
 */
import { ct, err, finish, getByKey, l, eur, all } from './lib/ct.ts';
import { TAXONOMY, flatten, LEAF_KEYS, ALL_KEYS } from './data/taxonomy.ts';
import { TIERS } from './data/tiers.ts';

const enumV = (vals: [string, string][]) => vals.map(([key, label]) => ({ key, label }));

// ─────────────────────────────────────────────────────────────────────────────
// 1. tax category — French VAT. Alcohol is standard-rated at 20%.
//    includedInPrice: true because French retail displays TTC (VAT-inclusive).
// ─────────────────────────────────────────────────────────────────────────────
async function ensureTaxCategory() {
  if (await getByKey('tax-categories', 'fr-tva')) { console.log('tax-category fr-tva: exists'); return; }
  const r = await ct('POST', '/tax-categories', {
    key: 'fr-tva',
    name: 'TVA France',
    description: 'French VAT — standard rate 20%, displayed inclusive (TTC).',
    rates: [{ name: 'TVA 20% (taux normal)', amount: 0.2, includedInPrice: true, country: 'FR' }],
  });
  if (r.ok) console.log('tax-category fr-tva: created'); else err('create fr-tva', r);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. product type `liquor`
// ─────────────────────────────────────────────────────────────────────────────
const LIQUOR_ATTRS = [
  // identity / provenance
  { name: 'producer',    label: l('Producer', 'Producteur'),          type: { name: 'text' },    attributeConstraint: 'SameForAll',        isSearchable: true },
  { name: 'region',      label: l('Region', 'Région'),                type: { name: 'text' },    attributeConstraint: 'SameForAll',        isSearchable: true },
  { name: 'appellation', label: l('Appellation', 'Appellation'),      type: { name: 'text' },    attributeConstraint: 'SameForAll',        isSearchable: true },
  { name: 'country',     label: l('Country', 'Pays'),                 type: { name: 'text' },    attributeConstraint: 'SameForAll',        isSearchable: true },
  { name: 'varietal',    label: l('Varietal', 'Cépage'),              type: { name: 'text' },    attributeConstraint: 'SameForAll',        isSearchable: true },
  { name: 'vintage',     label: l('Vintage', 'Millésime'),            type: { name: 'number' },  attributeConstraint: 'SameForAll',        isSearchable: true },
  { name: 'vintage_text',label: l('Vintage (text)', 'Millésime (texte)'), type: { name: 'text' },attributeConstraint: 'None',              isSearchable: true },
  // physical
  { name: 'volume_ml',   label: l('Volume (ml)', 'Volume (ml)'),      type: { name: 'number' },  attributeConstraint: 'CombinationUnique', isSearchable: true },
  { name: 'format',      label: l('Format', 'Format'),
    type: { name: 'enum', values: enumV([['bottle', 'Bottle'], ['magnum', 'Magnum'], ['can', 'Can'], ['bag-in-box', 'Bag-in-Box'], ['keg', 'Keg']]) },
    attributeConstraint: 'CombinationUnique', isSearchable: true },
  { name: 'pack_size',   label: l('Pack size', 'Nombre par lot'),     type: { name: 'number' },  attributeConstraint: 'SameForAll',        isSearchable: true },
  // alcohol / compliance
  { name: 'abv',           label: l('ABV (%)', 'Degré (% vol.)'),     type: { name: 'number' },  attributeConstraint: 'SameForAll',        isSearchable: true },
  { name: 'alcohol_units', label: l('Alcohol units', 'Unités d’alcool'), type: { name: 'number' }, attributeConstraint: 'None',            isSearchable: false },
  { name: 'age_restricted',label: l('Age restricted (18+)', 'Vente interdite aux moins de 18 ans'), type: { name: 'boolean' }, attributeConstraint: 'SameForAll', isSearchable: true },
  // merchandising facets
  { name: 'sweetness',   label: l('Sweetness', 'Sucrosité'),
    type: { name: 'enum', values: enumV([['brut-nature', 'Brut Nature'], ['extra-brut', 'Extra Brut'], ['brut', 'Brut'], ['sec', 'Sec'], ['demi-sec', 'Demi-Sec'], ['moelleux', 'Moelleux'], ['doux', 'Doux']]) },
    attributeConstraint: 'SameForAll', isSearchable: true },
  { name: 'organic',     label: l('Organic (Bio)', 'Bio'),            type: { name: 'boolean' }, attributeConstraint: 'SameForAll',        isSearchable: true },
  { name: 'gtin',        label: l('GTIN', 'GTIN'),                    type: { name: 'text' },    attributeConstraint: 'None',              isSearchable: true },
].map((a) => ({ ...a, isRequired: false }));

async function ensureProductType() {
  const existing = await getByKey('product-types', 'liquor');
  if (!existing) {
    const r = await ct('POST', '/product-types', {
      key: 'liquor',
      name: 'Liquor',
      description: 'Wine, spirits, beer and cider sold by Cave Bellevin cavistes.',
      attributes: LIQUOR_ATTRS,
    });
    if (r.ok) console.log(`product-type liquor: created with ${LIQUOR_ATTRS.length} attributes`); else err('create liquor', r);
    return;
  }
  // additive only — never remove an attribute that may already hold data
  const have = new Set((existing.attributes ?? []).map((a: any) => a.name));
  const missing = LIQUOR_ATTRS.filter((a) => !have.has(a.name));
  let version = existing.version;
  for (const attribute of missing) {
    const r = await ct('POST', '/product-types/key=liquor', { version, actions: [{ action: 'addAttributeDefinition', attribute }] });
    if (r.ok) version = r.body.version; else err(`liquor +${attribute.name}`, r);
  }
  console.log(`product-type liquor: exists, +${missing.length} attribute(s)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. custom type `store-programme` — the opt-in contract on each Store.
//    Dropped vs Metcash: coveo_source_id, braze_segment_id (no integrations here).
//    Renamed: suburb→city, state→region, postcode→postal_code, rapid_delivery_*→delivery_*.
// ─────────────────────────────────────────────────────────────────────────────
const FR_REGIONS: [string, string][] = [
  ['ILE_DE_FRANCE', 'Île-de-France'], ['AUVERGNE_RHONE_ALPES', 'Auvergne-Rhône-Alpes'],
  ['NOUVELLE_AQUITAINE', 'Nouvelle-Aquitaine'], ['HAUTS_DE_FRANCE', 'Hauts-de-France'],
  ['PROVENCE_ALPES_COTE_DAZUR', "Provence-Alpes-Côte d'Azur"], ['PAYS_DE_LA_LOIRE', 'Pays de la Loire'],
  ['GRAND_EST', 'Grand Est'], ['OCCITANIE', 'Occitanie'], ['BRETAGNE', 'Bretagne'],
  ['NORMANDIE', 'Normandie'], ['CENTRE_VAL_DE_LOIRE', 'Centre-Val de Loire'],
  ['BOURGOGNE_FRANCHE_COMTE', 'Bourgogne-Franche-Comté'], ['CORSE', 'Corse'],
];

const STORE_PROGRAMME_FIELDS = [
  { name: 'banner',            label: l('Banner', 'Enseigne'),               type: { name: 'Enum', values: enumV([['BELLEVIN', 'Cave Bellevin']]) } },
  { name: 'programme_tier',    label: l('Programme tier', 'Palier du programme'), type: { name: 'Enum', values: enumV(TIERS.map((t) => [t.key, t.label] as [string, string])) } },
  { name: 'lifecycle_state',   label: l('Lifecycle state', 'État du cycle de vie'),
    type: { name: 'Enum', values: enumV([['DRAFT', 'Draft'], ['ACTIVE', 'Active'], ['SUSPENDED', 'Suspended'], ['OFFBOARDED', 'Off-boarded']]) } },
  { name: 'opt_in_date',       label: l('Opt-in date', "Date d'adhésion"),   type: { name: 'Date' } },
  { name: 'activation_date',   label: l('Activation date', "Date d'activation"), type: { name: 'Date' } },
  { name: 'owner_key',         label: l('Owner key', 'Clé du propriétaire'), type: { name: 'String' } },
  // address (FR)
  { name: 'street_address',    label: l('Street address', 'Adresse'),        type: { name: 'String' } },
  { name: 'city',              label: l('City', 'Ville'),                    type: { name: 'String' } },
  { name: 'region',            label: l('Region', 'Région'),                 type: { name: 'Enum', values: enumV(FR_REGIONS) } },
  { name: 'postal_code',       label: l('Postal code', 'Code postal'),       type: { name: 'String' } },
  { name: 'latitude',          label: l('Latitude', 'Latitude'),             type: { name: 'Number' } },
  { name: 'longitude',         label: l('Longitude', 'Longitude'),           type: { name: 'Number' } },
  { name: 'phone',             label: l('Phone', 'Téléphone'),               type: { name: 'String' } },
  { name: 'opening_hours',     label: l('Opening hours', "Horaires d'ouverture"), type: { name: 'String' } },
  // fulfilment
  { name: 'click_collect_enabled', label: l('Click & collect enabled', 'Retrait en magasin activé'), type: { name: 'Boolean' } },
  { name: 'delivery_enabled',      label: l('Home delivery enabled', 'Livraison activée'),           type: { name: 'Boolean' } },
  { name: 'delivery_radius_km',    label: l('Delivery radius (km)', 'Rayon de livraison (km)'),      type: { name: 'Number' } },
  { name: 'timeslot_capacity',     label: l('Timeslot capacity', 'Capacité par créneau'),            type: { name: 'Number' } },
  // upstream feed wiring — onboarding WIRES these; upstream systems own the data
  { name: 'product_feed_ref',   label: l('Product feed ref', 'Réf. flux produits'),   type: { name: 'String' } },
  { name: 'pricing_feed_ref',   label: l('Pricing feed ref', 'Réf. flux prix'),       type: { name: 'String' } },
  { name: 'inventory_feed_ref', label: l('Inventory feed ref', 'Réf. flux stocks'),   type: { name: 'String' } },
].map((f) => ({ ...f, required: false }));

async function ensureStoreProgrammeType() {
  const existing = await getByKey('types', 'store-programme');
  if (!existing) {
    const r = await ct('POST', '/types', {
      key: 'store-programme',
      name: l('Store programme', 'Programme du magasin'),
      description: l('Opt-in programme membership, tier, lifecycle and location for a Cave Bellevin retailer.'),
      resourceTypeIds: ['store'],
      fieldDefinitions: STORE_PROGRAMME_FIELDS,
    });
    if (r.ok) console.log(`type store-programme: created with ${STORE_PROGRAMME_FIELDS.length} fields`); else err('create store-programme', r);
    return;
  }
  const have = new Set((existing.fieldDefinitions ?? []).map((f: any) => f.name));
  const missing = STORE_PROGRAMME_FIELDS.filter((f) => !have.has(f.name));
  let version = existing.version;
  for (const fieldDefinition of missing) {
    const r = await ct('POST', '/types/key=store-programme', { version, actions: [{ action: 'addFieldDefinition', fieldDefinition }] });
    if (r.ok) version = r.body.version; else err(`store-programme +${fieldDefinition.name}`, r);
  }
  console.log(`type store-programme: exists, +${missing.length} field(s)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3b. custom type `price-promo` on standalone prices.
//     Carries the reference "was" price so the PLP/PDP can show a strikethrough. Deliberately
//     separate from the promotion ENGINE: live promotions are real Cart/Product Discounts that
//     the retailer runs from /manage. This is reference-price display, not decisioning.
// ─────────────────────────────────────────────────────────────────────────────
const PRICE_PROMO_FIELDS = [
  { name: 'was_price', label: l('Was price', 'Prix barré'), type: { name: 'Money' }, required: false },
  { name: 'promo_id',  label: l('Promotion ID', 'ID de promotion'), type: { name: 'String' }, required: false },
];

async function ensurePricePromoType() {
  const existing = await getByKey('types', 'price-promo');
  if (!existing) {
    const r = await ct('POST', '/types', {
      key: 'price-promo',
      name: l('Price promotion', 'Promotion de prix'),
      description: l('Reference "was" price for strikethrough display on a standalone price.'),
      resourceTypeIds: ['standalone-price'],
      fieldDefinitions: PRICE_PROMO_FIELDS,
    });
    if (r.ok) console.log(`type price-promo: created with ${PRICE_PROMO_FIELDS.length} fields`); else err('create price-promo', r);
    return;
  }
  const have = new Set((existing.fieldDefinitions ?? []).map((f: any) => f.name));
  const missing = PRICE_PROMO_FIELDS.filter((f) => !have.has(f.name));
  let version = existing.version;
  for (const fieldDefinition of missing) {
    const r = await ct('POST', '/types/key=price-promo', { version, actions: [{ action: 'addFieldDefinition', fieldDefinition }] });
    if (r.ok) version = r.body.version; else err(`price-promo +${fieldDefinition.name}`, r);
  }
  console.log(`type price-promo: exists, +${missing.length} field(s)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. category tree — parents before children
// ─────────────────────────────────────────────────────────────────────────────
async function ensureCategories() {
  const nodes = flatten(TAXONOMY);
  let created = 0;
  for (const [i, { node, parent }] of nodes.entries()) {
    if (await getByKey('categories', node.key)) continue;
    const r = await ct('POST', '/categories', {
      key: node.key,
      name: l(node.en, node.fr),
      slug: l(node.key, node.key),
      orderHint: (0.01 * (i + 1)).toFixed(4),
      ...(parent ? { parent: { typeId: 'category', key: parent } } : {}),
    });
    if (r.ok) created++; else err(`category ${node.key}`, r);
  }
  console.log(`categories: ${nodes.length} in tree, ${created} created, ${nodes.length - created} already present`);
}

/**
 * Delete categories that are no longer in the taxonomy. Needed because the tree was reshaped after
 * a first seed (see taxonomy.ts) and additive seeding would otherwise leave orphans in the nav.
 * Refuses to delete anything that still has products assigned — losing a category assignment
 * silently is far worse than an orphan node.
 */
async function pruneCategories() {
  const want = new Set(ALL_KEYS);
  const live = await all('categories');
  const stale = live.filter((c: any) => !want.has(c.key));
  if (!stale.length) { console.log('categories: no stale nodes'); return; }
  // children first, so a parent is never deleted out from under one
  stale.sort((a: any, b: any) => (b.ancestors?.length ?? 0) - (a.ancestors?.length ?? 0));
  let deleted = 0;
  for (const c of stale) {
    // A `where` query, deliberately not the search index: search is eventually consistent and
    // can be deactivated per project, so a stale/failed index must never authorise a delete.
    const used = await ct('GET', `/product-projections?where=${encodeURIComponent(`categories(id="${c.id}")`)}&limit=0`);
    const count = used.ok ? (used.body.total ?? 0) : -1;
    if (count !== 0) { err(`prune ${c.key}`, { ok: false, status: 0, body: { errors: [{ message: `has ${count} product(s) — refusing to delete` }] } }); continue; }
    const r = await ct('DELETE', `/categories/key=${c.key}?version=${c.version}`);
    if (r.ok) deleted++; else err(`delete category ${c.key}`, r);
  }
  console.log(`categories: pruned ${deleted}/${stale.length} stale node(s)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. programme-tiers custom objects — HQ governance templates
// ─────────────────────────────────────────────────────────────────────────────
async function ensureTiers() {
  for (const tier of TIERS) {
    const { key, ...value } = tier;
    const r = await ct('POST', '/custom-objects', { container: 'programme-tiers', key, value });
    if (!r.ok) err(`tier ${key}`, r);
  }
  console.log(`programme-tiers: ${TIERS.length} upserted (${TIERS.map((t) => t.key).join(', ')})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. commerce primitives for checkout — zone + shipping methods
// ─────────────────────────────────────────────────────────────────────────────
async function ensureShipping() {
  if (!(await getByKey('zones', 'fr'))) {
    const r = await ct('POST', '/zones', { key: 'fr', name: 'France', description: 'Metropolitan France', locations: [{ country: 'FR' }] });
    if (r.ok) console.log('zone fr: created'); else err('create zone fr', r);
  } else console.log('zone fr: exists');

  const methods = [
    { key: 'retrait-magasin', name: 'Retrait en magasin', en: 'Click & Collect', fr: 'Retrait en magasin',
      desc: 'Collect from your caviste — ready in 2 hours.', price: 0, freeAbove: null, isDefault: true },
    { key: 'livraison-standard', name: 'Livraison standard', en: 'Standard delivery', fr: 'Livraison standard',
      desc: 'Delivered in 2–3 working days. Free over €150.', price: 6.9, freeAbove: 150, isDefault: false },
  ];
  for (const m of methods) {
    if (await getByKey('shipping-methods', m.key)) { console.log(`shipping-method ${m.key}: exists`); continue; }
    const r = await ct('POST', '/shipping-methods', {
      key: m.key,
      name: m.name,
      localizedName: l(m.en, m.fr),
      description: m.desc,
      taxCategory: { typeId: 'tax-category', key: 'fr-tva' },
      isDefault: m.isDefault,
      zoneRates: [{
        zone: { typeId: 'zone', key: 'fr' },
        shippingRates: [{ price: eur(m.price), ...(m.freeAbove ? { freeAbove: eur(m.freeAbove) } : {}) }],
      }],
    });
    if (r.ok) console.log(`shipping-method ${m.key}: created`); else err(`create shipping-method ${m.key}`, r);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// verify — read back, never trust the write responses
// ─────────────────────────────────────────────────────────────────────────────
async function verify() {
  console.log('\n── verify ──');
  const checks: [string, () => Promise<string | null>][] = [
    ['tax-category fr-tva 20% TTC', async () => {
      const t = await getByKey('tax-categories', 'fr-tva');
      const rate = t?.rates?.find((r: any) => r.country === 'FR');
      if (!rate) return 'no FR rate';
      if (rate.amount !== 0.2) return `amount ${rate.amount}, want 0.2`;
      if (rate.includedInPrice !== true) return 'not includedInPrice (must display TTC)';
      return null;
    }],
    [`product-type liquor (${LIQUOR_ATTRS.length} attrs)`, async () => {
      const pt = await getByKey('product-types', 'liquor');
      const have = new Set((pt?.attributes ?? []).map((a: any) => a.name));
      const missing = LIQUOR_ATTRS.filter((a) => !have.has(a.name)).map((a) => a.name);
      return missing.length ? `missing ${missing.join(', ')}` : null;
    }],
    [`type store-programme (${STORE_PROGRAMME_FIELDS.length} fields, on store)`, async () => {
      const t = await getByKey('types', 'store-programme');
      if (!t?.resourceTypeIds?.includes('store')) return 'not bound to store';
      const have = new Set((t.fieldDefinitions ?? []).map((f: any) => f.name));
      const missing = STORE_PROGRAMME_FIELDS.filter((f) => !have.has(f.name)).map((f) => f.name);
      if (missing.length) return `missing ${missing.join(', ')}`;
      const tierField = t.fieldDefinitions.find((f: any) => f.name === 'programme_tier');
      const tierKeys = (tierField?.type?.values ?? []).map((v: any) => v.key).sort().join(',');
      const want = TIERS.map((x) => x.key).sort().join(',');
      return tierKeys === want ? null : `programme_tier enum ${tierKeys}, want ${want}`;
    }],
    [`category tree (${ALL_KEYS.length} nodes, ${LEAF_KEYS.length} leaves)`, async () => {
      const cats = await all('categories');
      const tree = flatten(TAXONOMY);
      if (cats.length !== tree.length) return `${cats.length} categories, want ${tree.length}`;
      const byKey = new Map(cats.map((c: any) => [c.key, c]));
      for (const { node, parent } of tree) {
        const c = byKey.get(node.key);
        if (!c) return `missing ${node.key}`;
        const actualParent = c.parent ? byKey.get([...byKey.values()].find((x: any) => x.id === c.parent.id)?.key)?.key : undefined;
        if (parent && actualParent !== parent) return `${node.key} parent=${actualParent ?? 'none'}, want ${parent}`;
        if (!parent && c.parent) return `${node.key} should be a root`;
      }
      const leaves = cats.filter((c: any) => !cats.some((x: any) => x.parent?.id === c.id));
      return leaves.length === LEAF_KEYS.length ? null : `${leaves.length} leaves, want ${LEAF_KEYS.length}`;
    }],
    ['programme-tiers custom objects', async () => {
      const objs = await all('custom-objects/programme-tiers');
      const keys = objs.map((o: any) => o.key).sort().join(',');
      const want = TIERS.map((t) => t.key).sort().join(',');
      if (keys !== want) return `${keys}, want ${want}`;
      const premium = objs.find((o: any) => o.key === 'PREMIUM');
      return premium?.value?.features?.homeDelivery === true ? null : 'PREMIUM.features.homeDelivery is not true';
    }],
    ['type price-promo (on standalone-price)', async () => {
      const t = await getByKey('types', 'price-promo');
      if (!t) return 'missing';
      if (!t.resourceTypeIds?.includes('standalone-price')) return 'not bound to standalone-price';
      const have = new Set((t.fieldDefinitions ?? []).map((f: any) => f.name));
      const missing = PRICE_PROMO_FIELDS.filter((f) => !have.has(f.name)).map((f) => f.name);
      return missing.length ? `missing ${missing.join(', ')}` : null;
    }],
    ['zone fr + 2 shipping methods', async () => {
      if (!(await getByKey('zones', 'fr'))) return 'zone fr missing';
      for (const k of ['retrait-magasin', 'livraison-standard']) if (!(await getByKey('shipping-methods', k))) return `${k} missing`;
      return null;
    }],
  ];
  for (const [label, check] of checks) {
    const problem = await check();
    console.log(`  ${problem ? '✗' : '✓'} ${label}${problem ? ` — ${problem}` : ''}`);
    if (problem) err(`verify ${label}`, { ok: false, status: 0, body: { errors: [{ message: problem }] } });
  }
}

await ensureTaxCategory();
await ensureProductType();
await ensureStoreProgrammeType();
await ensurePricePromoType();
await ensureCategories();
await pruneCategories();
await ensureTiers();
await ensureShipping();
await verify();
finish('data model');
