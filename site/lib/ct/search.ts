import 'server-only';
import type { ProductSearchRequest } from '@commercetools/platform-sdk';
import { apiRoot } from './client';
import { mapProduct, type AppProduct } from '@/lib/mappers/product';
import { getStoreContextOrNull } from '@/lib/session';
import { categoryById } from './categories';
import { CURRENCY, COUNTRY, DATA_LOCALE, PAGE_SIZE } from '@/lib/constants';

export interface FacetBucket { term: string; label: string; count: number }
export interface FacetGroup { name: string; label: string; buckets: FacetBucket[] }

export interface SearchParams {
  q?: string;
  /** category id — matched across its whole subtree, so a root category works */
  categoryId?: string;
  producer?: string;
  country?: string;
  varietal?: string;
  format?: string;
  sweetness?: string;
  organic?: boolean;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  sort?: 'price-asc' | 'price-desc' | 'name-asc' | 'relevance';
  page?: number;
  /** internal: widen a single request (homepage rails scan for promotions) */
  limit?: number;
}

export interface SearchResult {
  products: AppProduct[];
  facets: FacetGroup[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

const FACET_LABELS: Record<string, string> = {
  producer: 'Producer', country: 'Country', varietal: 'Varietal', format: 'Format', sweetness: 'Sweetness',
};

const EMPTY: SearchResult = { products: [], facets: [], total: 0, page: 1, pageSize: PAGE_SIZE, pages: 0 };

export async function searchProducts(params: SearchParams): Promise<SearchResult> {
  const ctx = await getStoreContextOrNull();
  // No store, no catalogue: range, price and availability are all store-scoped by definition.
  if (!ctx?.store.productSelectionId) return EMPTY;

  const and: NonNullable<ProductSearchRequest['query']>[] = [
    { exact: { field: 'productSelections', value: ctx.store.productSelectionId } },
  ];

  // Text search is a TIER CAPABILITY — an ESSENTIEL store has no search, so ignore any q it is
  // given rather than quietly serving a feature the retailer has not opted into.
  if (params.q && ctx.tier.features.productSearch) {
    const q = params.q.trim();
    and.push({
      or: [
        { fullText: { field: 'name', language: DATA_LOCALE, value: q } },
        // wildcard on an ATTRIBUTE needs fieldType; on a built-in field (sku) it must be omitted
        { wildcard: { field: 'variants.attributes.producer', fieldType: 'text', value: `*${q}*`, caseInsensitive: true } },
        { wildcard: { field: 'variants.sku', value: `*${q}*`, caseInsensitive: true } },
        { exact: { field: 'variants.attributes.gtin', fieldType: 'text', value: q } },
      ],
    });
  }
  // subTree, not `categories`: products hang off leaves, so a root category would match nothing
  if (params.categoryId) and.push({ exact: { field: 'categoriesSubTree', value: params.categoryId } });

  for (const [field, value] of [
    ['variants.attributes.producer', params.producer],
    ['variants.attributes.country', params.country],
    ['variants.attributes.varietal', params.varietal],
  ] as const) {
    if (value) and.push({ exact: { field, fieldType: 'text', value } });
  }
  // enum attributes are addressed as `.key` WITH fieldType 'enum' — not the bare path, and not
  // `.key` with 'text'. Getting it wrong 400s the whole request, facets included.
  if (params.format) and.push({ exact: { field: 'variants.attributes.format.key', fieldType: 'enum', value: params.format } });
  if (params.sweetness) and.push({ exact: { field: 'variants.attributes.sweetness.key', fieldType: 'enum', value: params.sweetness } });
  if (params.organic) and.push({ exact: { field: 'variants.attributes.organic', fieldType: 'boolean', value: true } });

  if (params.minPrice != null || params.maxPrice != null) {
    and.push({
      range: {
        field: 'variants.prices.centAmount', fieldType: 'number',
        ...(params.minPrice != null ? { gte: params.minPrice } : {}),
        ...(params.maxPrice != null ? { lte: params.maxPrice } : {}),
      },
    });
  }
  if (params.inStockOnly && ctx.store.supplyChannelId) {
    and.push({ exact: { field: 'variants.availability.isOnStockForChannel', value: ctx.store.supplyChannelId } });
  }

  const sort: ProductSearchRequest['sort'] =
    params.sort === 'price-asc' ? [{ field: 'variants.prices.centAmount', order: 'asc', mode: 'min' }]
    : params.sort === 'price-desc' ? [{ field: 'variants.prices.centAmount', order: 'desc', mode: 'max' }]
    : params.sort === 'name-asc' ? [{ field: 'name', language: DATA_LOCALE, order: 'asc' }]
    : undefined;

  const page = Math.max(1, params.page ?? 1);

  const body: ProductSearchRequest = {
    // commercetools rejects an `and` holding a single expression — unwrap it
    query: and.length === 1 ? and[0] : { and },
    sort,
    facets: [
      { distinct: { name: 'producer', field: 'variants.attributes.producer', fieldType: 'text', limit: 40 } },
      { distinct: { name: 'country', field: 'variants.attributes.country', fieldType: 'text', limit: 25 } },
      { distinct: { name: 'varietal', field: 'variants.attributes.varietal', fieldType: 'text', limit: 40 } },
      { distinct: { name: 'format', field: 'variants.attributes.format.key', fieldType: 'enum', limit: 10 } },
      { distinct: { name: 'sweetness', field: 'variants.attributes.sweetness.key', fieldType: 'enum', limit: 10 } },
    ],
    productProjectionParameters: {
      priceCurrency: CURRENCY,
      priceCountry: COUNTRY,
      // the store's price channel — this is what makes the SAME sku cost more in Paris than Lille
      ...(ctx.store.priceChannelId ? { priceChannel: ctx.store.priceChannelId } : {}),
      localeProjection: [DATA_LOCALE],
    },
    limit: params.limit ?? PAGE_SIZE,
    offset: (page - 1) * (params.limit ?? PAGE_SIZE),
  };

  try {
    const { body: res } = await apiRoot.products().search().post({ body }).execute();
    const products = (res.results ?? [])
      .map((r) => r.productProjection)
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => mapProduct(p, ctx.store.supplyChannelId));

    const facets: FacetGroup[] = (res.facets ?? []).map((f) => {
      const buckets = ((f as { buckets?: { key: unknown; count: number }[] }).buckets ?? [])
        .map((b) => ({ term: String(b.key), label: String(b.key), count: b.count }))
        .filter((b) => b.term && b.term !== 'undefined')
        .sort((a, b) => b.count - a.count);
      return { name: f.name, label: FACET_LABELS[f.name] ?? f.name, buckets };
    }).filter((g) => g.buckets.length > 1); // a facet with one value filters nothing

    const total = res.total ?? 0;
    return { products, facets, total, page, pageSize: PAGE_SIZE, pages: Math.ceil(total / PAGE_SIZE) };
  } catch (e) {
    // An empty grid and a broken query look identical to the shopper. Logging is the only way this
    // is ever noticed — a malformed facet silently rendered "Aucune bouteille" across the whole PLP.
    console.error('[ct] searchProducts failed:', (e as Error).message);
    return { ...EMPTY, page };
  }
}

/** One product by slug, store-scoped (a deep link to something the store doesn't range 404s). */
export async function productBySlug(slug: string): Promise<AppProduct | null> {
  const ctx = await getStoreContextOrNull();
  if (!ctx?.store.productSelectionId) return null;
  try {
    const { body } = await apiRoot.products().search().post({
      body: {
        query: {
          and: [
            { exact: { field: 'productSelections', value: ctx.store.productSelectionId } },
            { exact: { field: 'slug', language: DATA_LOCALE, value: slug } },
          ],
        },
        productProjectionParameters: {
          priceCurrency: CURRENCY,
          priceCountry: COUNTRY,
          ...(ctx.store.priceChannelId ? { priceChannel: ctx.store.priceChannelId } : {}),
          localeProjection: [DATA_LOCALE],
        },
        limit: 1,
      },
    }).execute();
    const p = body.results?.[0]?.productProjection;
    return p ? mapProduct(p, ctx.store.supplyChannelId) : null;
  } catch (e) {
    console.error(`[ct] productBySlug(${slug}) failed:`, (e as Error).message);
    return null;
  }
}

/**
 * Products actually on promotion in the selected store.
 *
 * There is no way to filter on a price's custom fields in Product Search, so this scans wide pages
 * and keeps the ones carrying a was_price. Sorted price-ASC deliberately: discounted stock sits at
 * the cheap end (€4-14 here), so a price-desc scan of the top 100 returned zero promotions and the
 * rail silently degraded to an alphabetical list.
 */
export async function promotedProducts(limit = 4): Promise<AppProduct[]> {
  const found: AppProduct[] = [];
  for (const page of [1, 2]) {
    const res = await searchProducts({ sort: 'price-asc', limit: 100, page });
    found.push(...res.products.filter((p) => p.variant.wasPrice));
    if (found.length >= limit || res.products.length < 100) break;
  }
  return found.slice(0, limit);
}

/** Products in the same leaf category, for the PDP's "in the same range" rail. */
export async function relatedProducts(product: AppProduct, limit = 6): Promise<AppProduct[]> {
  const catId = product.categoryIds[0];
  if (!catId) return [];
  const cat = await categoryById(catId);
  if (!cat) return [];
  const res = await searchProducts({ categoryId: cat.id, sort: 'name-asc' });
  return res.products.filter((p) => p.id !== product.id).slice(0, limit);
}
