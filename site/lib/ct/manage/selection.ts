import 'server-only';
import { apiRoot } from '@/lib/ct/client';
import { mapProduct, type AppProduct } from '@/lib/mappers/product';
import { CURRENCY, COUNTRY, DATA_LOCALE, PAGE_SIZE } from '@/lib/constants';
import type { AppStore } from '@/lib/ct/stores';

/**
 * The cave's own range: what it stocks out of the whole Groupe Vinéa catalogue.
 *
 * The store's Product Selection is the authoritative range, and it is the same object the
 * storefront filters on — so adding a wine here makes it appear on the shop immediately.
 */

export interface RangeProduct extends AppProduct {
  ranged: boolean;
}

export interface RangePage {
  products: RangeProduct[];
  total: number;
  page: number;
  pages: number;
  /** how many products the cave currently ranges (whole selection, not this page) */
  rangedCount: number;
}

async function selectionProductIds(selectionId: string): Promise<Set<string>> {
  const ids = new Set<string>();
  let offset = 0;
  try {
    for (;;) {
      const { body } = await apiRoot.productSelections().withId({ ID: selectionId })
        .products().get({ queryArgs: { limit: 500, offset, withTotal: true } }).execute();
      for (const a of body.results) if (a.product?.id) ids.add(a.product.id);
      offset += body.results.length;
      if (!body.results.length || ids.size >= (body.total ?? 0)) break;
    }
  } catch (e) {
    console.error('[ct] selectionProductIds failed:', (e as Error).message);
  }
  return ids;
}

/**
 * Browse the FULL network catalogue, flagging which products this cave ranges.
 *
 * Deliberately not scoped to the store's selection: the point of this screen is to add things the
 * cave does not yet stock, so it has to show the whole catalogue with the range as an overlay.
 */
export async function browseCatalogue(
  store: AppStore,
  opts: { page?: number; q?: string; rangedOnly?: boolean } = {},
): Promise<RangePage> {
  const page = Math.max(1, opts.page ?? 1);
  const selectionId = store.productSelectionId;
  const ranged = selectionId ? await selectionProductIds(selectionId) : new Set<string>();

  const and: Record<string, unknown>[] = [];
  if (opts.q?.trim()) {
    const q = opts.q.trim();
    and.push({
      or: [
        { fullText: { field: 'name', language: DATA_LOCALE, value: q } },
        { wildcard: { field: 'variants.attributes.producer', fieldType: 'text', value: `*${q}*`, caseInsensitive: true } },
        { wildcard: { field: 'variants.sku', value: `*${q}*`, caseInsensitive: true } },
      ],
    });
  }
  if (opts.rangedOnly && selectionId) {
    and.push({ exact: { field: 'productSelections', value: selectionId } });
  }

  try {
    const { body } = await apiRoot.products().search().post({
      body: {
        ...(and.length ? { query: and.length === 1 ? and[0] : { and } } : {}),
        sort: [{ field: 'name', language: DATA_LOCALE, order: 'asc' }],
        productProjectionParameters: {
          priceCurrency: CURRENCY,
          priceCountry: COUNTRY,
          ...(store.priceChannelId ? { priceChannel: store.priceChannelId } : {}),
          localeProjection: [DATA_LOCALE],
        },
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      },
    }).execute();

    const products = (body.results ?? [])
      .map((r) => r.productProjection)
      .filter((p): p is NonNullable<typeof p> => !!p)
      .map((p) => ({ ...mapProduct(p, store.supplyChannelId), ranged: ranged.has(p.id) }));

    const total = body.total ?? 0;
    return { products, total, page, pages: Math.ceil(total / PAGE_SIZE), rangedCount: ranged.size };
  } catch (e) {
    console.error('[ct] browseCatalogue failed:', (e as Error).message);
    return { products: [], total: 0, page, pages: 0, rangedCount: ranged.size };
  }
}

export interface RangeChangeResult { ok: boolean; rangedCount: number; error?: string }

/**
 * Add or remove one product from the cave's range.
 *
 * Enforces the tier's `rangeCeiling` HERE, server-side — the UI disabling a button is a courtesy,
 * not a permission.
 */
export async function setRanged(
  store: AppStore,
  productId: string,
  ranged: boolean,
  rangeCeiling: number | null,
): Promise<RangeChangeResult> {
  const selectionId = store.productSelectionId;
  if (!selectionId) return { ok: false, rangedCount: 0, error: 'no_selection' };

  const current = await selectionProductIds(selectionId);
  if (ranged && current.has(productId)) return { ok: true, rangedCount: current.size };
  if (!ranged && !current.has(productId)) return { ok: true, rangedCount: current.size };

  if (ranged && rangeCeiling !== null && current.size >= rangeCeiling) {
    return { ok: false, rangedCount: current.size, error: 'ceiling_reached' };
  }

  try {
    const { body: selection } = await apiRoot.productSelections().withId({ ID: selectionId }).get().execute();
    const { body } = await apiRoot.productSelections().withId({ ID: selectionId }).post({
      body: {
        version: selection.version,
        actions: [{
          action: ranged ? 'addProduct' : 'removeProduct',
          product: { typeId: 'product', id: productId },
        }],
      },
    }).execute();
    return { ok: true, rangedCount: body.productCount ?? (ranged ? current.size + 1 : current.size - 1) };
  } catch (e) {
    console.error('[ct] setRanged failed:', (e as Error).message);
    return { ok: false, rangedCount: current.size, error: 'update_failed' };
  }
}
