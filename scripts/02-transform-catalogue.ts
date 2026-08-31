/**
 * 02 — transform the source liquor pack into the Cave Bellevin catalogue.
 *
 * Reads the transformed Cellarbrations intermediate JSON from the metcash-demo repo and rewrites it
 * for this project. Output lands in data/catalogue/ (gitignored — derived from a
 * commercial-in-confidence pack, so it is never committed).
 *
 * What this does, and why:
 *  - FILTERS to the 499 products that read as a French caviste's range. The 296 dropped are
 *    premix cans, seltzer, low-carb/mid-strength/Australian beer, ginger beer, cask wine and
 *    Australian cider — see EXCLUDED in data/taxonomy.ts.
 *  - REMAPS categories onto the new tree via SOURCE_MAP.
 *  - PARSES the structured description tail ("Alcohol Volume: … Country of Origin: … Region: …")
 *    into real attributes, then TRUNCATES it, which leaves clean prose for the PDP and removes
 *    the Australian "Standard Drinks" concept.
 *  - DERIVES the attributes the source never populated: producer, country, region, appellation,
 *    abv, vintage, pack_size, sweetness, organic, alcohol_units, and a real `format`
 *    (the source says "bottle" for all 795).
 *  - CONVERTS AUD → EUR and snaps to French retail price points (x,95 / x,45).
 *  - KEEPS the source image URLs verbatim.
 *
 * Run: npm run generate:catalogue
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, ENV, l } from './lib/ct.ts';
import { SOURCE_MAP, EXCLUDED } from './data/taxonomy.ts';

const SRC = ENV.SOURCE_DIR || join(ROOT, '..', 'metcash-demo', 'data', 'dataset', 'cellarbrations');
const OUT = join(ROOT, 'data', 'catalogue');
const AUD_TO_EUR = 0.6;

let src: { products: any[]; prices: any[] };
try {
  src = {
    products: JSON.parse(readFileSync(join(SRC, 'products.json'), 'utf8')),
    prices: JSON.parse(readFileSync(join(SRC, 'prices.json'), 'utf8')),
  };
} catch (e) {
  console.error(`FATAL: cannot read the source pack at ${SRC}\n       ${(e as Error).message}`);
  console.error('       Set SOURCE_DIR to override.');
  process.exit(1);
}

// ── description parsing ───────────────────────────────────────────────────────
const MARKERS = ['Alcohol Volume:', 'Pack Format:', 'Standard Drinks:', 'Pack Type:', 'Country of Origin:', 'Region:', 'Vintage:'];
const grab = (d: string, label: string): string | undefined => {
  const i = d.indexOf(label);
  if (i < 0) return undefined;
  const rest = d.slice(i + label.length);
  // value runs until the next structured marker
  let end = rest.length;
  for (const m of MARKERS) { const j = rest.indexOf(m); if (j >= 0 && j < end) end = j; }
  const v = rest.slice(0, end).trim();
  return v || undefined;
};
const prose = (d: string): string => {
  let cut = d.length;
  for (const m of MARKERS) { const i = d.indexOf(m); if (i >= 0 && i < cut) cut = i; }
  return d.slice(0, cut).trim();
};

// ── derivations ───────────────────────────────────────────────────────────────
const SWEETNESS: [RegExp, string][] = [
  [/\bbrut\s+nature\b/i, 'brut-nature'], [/\bextra[\s-]brut\b/i, 'extra-brut'], [/\bbrut\b/i, 'brut'],
  [/\bdemi[\s-]sec\b/i, 'demi-sec'], [/\bmoelleux\b/i, 'moelleux'],
  [/\bdoux\b|\bsweet\b/i, 'doux'], [/\bsec\b|\bdry\b/i, 'sec'],
];
const APPELLATION_COUNTRIES = new Set(['France', 'Italy', 'Spain', 'Portugal', 'Germany', 'Austria', 'Greece']);

function deriveFormat(name: string, volumeMl: number | undefined): string {
  if (/\bkegs?\b/i.test(name)) return 'keg';
  if (/\bcans?\b/i.test(name)) return 'can';
  if (/\bmagnum\b/i.test(name) || (volumeMl ?? 0) >= 1500) return 'magnum';
  if (/\bcask\b|bag[\s-]?in[\s-]?box\b/i.test(name)) return 'bag-in-box';
  return 'bottle';
}

const num = (v: string | undefined): number | undefined => {
  if (!v) return undefined;
  const m = v.match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : undefined;
};

/** AUD → EUR, snapped to a French retail price point (x,95 / x,45). */
export function frPrice(aud: number): number {
  const raw = aud * AUD_TO_EUR;
  const half = Math.round(raw * 2) / 2;          // nearest 0.50
  return Math.max(0.95, Number((half - 0.05).toFixed(2)));
}

// ── transform products ────────────────────────────────────────────────────────
const stats = { in: src.products.length, kept: 0, droppedNoCategory: 0, byNewCat: {} as Record<string, number>, formats: {} as Record<string, number>, countries: {} as Record<string, number> };
const products: any[] = [];
const keptSkus = new Set<string>();

for (const p of src.products) {
  const cats = [...new Set((p.categories ?? []).map((c: any) => SOURCE_MAP.get(c.key)).filter(Boolean) as string[])];
  if (!cats.length) { stats.droppedNoCategory++; continue; }

  const name: string = p.name?.['en-AU'] ?? '';
  const rawDesc: string = p.description?.['en-AU'] ?? '';
  const srcAttr = new Map((p.masterVariant.attributes ?? []).map((a: any) => [a.name, a.value]));

  const country = grab(rawDesc, 'Country of Origin:');
  const region = (srcAttr.get('region') as string) ?? grab(rawDesc, 'Region:');
  const abv = num(grab(rawDesc, 'Alcohol Volume:'));
  const volumeMl = srcAttr.get('volume_ml') as number | undefined;
  const vintageText = (srcAttr.get('vintage_text') as string) ?? grab(rawDesc, 'Vintage:');
  const vintage = /^(19|20)\d{2}$/.test(vintageText ?? '') ? Number(vintageText) : undefined;
  const packSize = num(name.match(/(\d+)\s*(?:pack|pk)\b/i)?.[1]) ?? num(grab(rawDesc, 'Pack Format:')) ?? 1;
  const format = deriveFormat(name, volumeMl);
  const haystack = `${name} ${rawDesc}`;
  const sweetness = SWEETNESS.find(([re]) => re.test(haystack))?.[1];
  const organic = /\borganic\b|\bbio\b|\bbiodynamic\b/i.test(haystack);
  const standardDrinks = srcAttr.get('standard_drinks') as number | undefined;
  const alcoholUnits = standardDrinks ?? (abv && volumeMl ? Number(((volumeMl * (abv / 100)) / 10).toFixed(1)) : undefined);

  const attrs: { name: string; value: unknown }[] = [];
  const put = (n: string, v: unknown) => { if (v !== undefined && v !== null && v !== '') attrs.push({ name: n, value: v }); };
  put('producer', p._meta?.brand);
  put('region', region);
  put('appellation', country && APPELLATION_COUNTRIES.has(country) ? region : undefined);
  put('country', country);
  put('varietal', srcAttr.get('varietal'));
  put('vintage', vintage);
  put('vintage_text', vintageText);
  put('volume_ml', volumeMl);
  put('format', format);
  put('pack_size', packSize);
  put('abv', abv);
  put('alcohol_units', alcoholUnits);
  put('age_restricted', srcAttr.get('age_restricted') ?? true);
  put('sweetness', sweetness);
  put('organic', organic);
  put('gtin', p._meta?.gtin);

  const cleanDesc = prose(rawDesc);
  products.push({
    key: p.key,
    productType: { typeId: 'product-type', key: 'liquor' },
    name: l(name),
    slug: l(p.slug?.['en-AU'] ?? `${p.key}`),
    ...(cleanDesc ? { description: l(cleanDesc) } : {}),
    categories: cats.map((key) => ({ typeId: 'category', key })),
    masterVariant: {
      key: p.masterVariant.key,
      sku: p.masterVariant.sku,
      attributes: attrs,
      images: p.masterVariant.images ?? [],
    },
    variants: [],
    taxCategory: { typeId: 'tax-category', key: 'fr-tva' },
    priceMode: 'Standalone',
    publish: true,
  });
  keptSkus.add(p.masterVariant.sku);
  stats.kept++;
  for (const c of cats) stats.byNewCat[c] = (stats.byNewCat[c] ?? 0) + 1;
  stats.formats[format] = (stats.formats[format] ?? 0) + 1;
  if (country) stats.countries[country] = (stats.countries[country] ?? 0) + 1;
}

// ── transform prices ──────────────────────────────────────────────────────────
// Only the NATIONAL baseline is carried. The source's 300 store-scoped prices belong to 20
// Cellarbrations stores that do not exist here; phase 04 generates per-store overrides with
// deliberate offsets for the eight Cave Bellevin stores instead.
const prices: any[] = [];
let promoCount = 0;
for (const pr of src.prices) {
  if (!pr.key.endsWith('__national') || !keptSkus.has(pr.sku)) continue;
  const eurAmount = frPrice(pr.value.centAmount / 100);
  const wasAud = pr._meta?.was_price_aud ? Number(pr._meta.was_price_aud) : null;
  const wasEur = wasAud ? frPrice(wasAud) : null;
  const onPromo = !!wasEur && wasEur > eurAmount;
  if (onPromo) promoCount++;
  // The was-price is a real custom field on the Standalone Price (type `price-promo`), not loose
  // metadata: the PDP/PLP read it through the API like any other field. Source promo ids carry a
  // `CB-` (Cellarbrations) prefix — rebranded so nothing on screen says Cellarbrations.
  const promoId = (pr._meta?.promo_id ?? '').replace(/^CB-/, 'CAVE-') || null;
  prices.push({
    key: `${pr.sku}__national`,
    sku: pr.sku,
    value: { currencyCode: 'EUR', centAmount: Math.round(eurAmount * 100) },
    ...(onPromo
      ? {
          custom: {
            type: { typeId: 'type', key: 'price-promo' },
            fields: {
              was_price: { currencyCode: 'EUR', centAmount: Math.round(wasEur! * 100) },
              ...(promoId ? { promo_id: promoId } : {}),
            },
          },
        }
      : {}),
  });
}

// ── write ─────────────────────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'products.json'), JSON.stringify(products, null, 1));
writeFileSync(join(OUT, 'prices.json'), JSON.stringify(prices, null, 1));

console.log(`source        ${stats.in} products at ${SRC}`);
console.log(`kept          ${stats.kept}`);
console.log(`dropped       ${stats.droppedNoCategory} (only in excluded categories: ${Object.values(EXCLUDED).slice(0, 4).join(', ')}, …)`);
console.log(`prices        ${prices.length} national, ${promoCount} with a was-price`);
console.log(`formats       ${JSON.stringify(stats.formats)}`);
console.log(`top countries ${Object.entries(stats.countries).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k}:${v}`).join(' ')}`);
console.log(`categories    ${Object.keys(stats.byNewCat).length} of 30 leaves populated`);
const empty = [...SOURCE_MAP.values()].filter((k, i, a) => a.indexOf(k) === i).filter((k) => !stats.byNewCat[k]);
if (empty.length) console.log(`EMPTY LEAVES  ${empty.join(', ')}`);
console.log(`\nwrote ${OUT}/products.json + prices.json`);
