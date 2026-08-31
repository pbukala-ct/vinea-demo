import 'server-only';
import type { CartDiscount, CartDiscountDraft } from '@commercetools/platform-sdk';
import { apiRoot } from '@/lib/ct/client';
import { CURRENCY, DISPLAY_LOCALE } from '@/lib/constants';

/**
 * The cave's own promotions — real commercetools Cart Discounts, scoped with the `stores` field.
 *
 * Store scoping matters twice over: it is what makes a Paris promotion not apply in Lille, and it
 * is what stops one operator seeing or editing another's promotions.
 */

const q = (v: string) => v.replace(/"/g, '');

export type PromoKind = 'percent-off-cart' | 'amount-off-cart';

export interface AppPromotion {
  id: string;
  version: number;
  name: string;
  isActive: boolean;
  kind: PromoKind;
  /** percent (0-100) or minor units, depending on kind */
  value: number;
  /** minimum cart total in minor units to qualify */
  minSpend: number;
  validUntil?: string;
}

function toApp(d: CartDiscount): AppPromotion {
  const v = d.value;
  const kind: PromoKind = v.type === 'absolute' ? 'amount-off-cart' : 'percent-off-cart';
  const value = v.type === 'absolute'
    ? (v.money?.[0]?.centAmount ?? 0)
    : v.type === 'relative' ? Math.round((v.permyriad ?? 0) / 100) : 0;
  const min = /totalPrice\s*>=?\s*"?(\d+)/.exec(d.cartPredicate ?? '');
  return {
    id: d.id,
    version: d.version,
    name: d.name?.[DISPLAY_LOCALE] ?? d.name?.en ?? Object.values(d.name ?? {})[0] ?? '(sans nom)',
    isActive: d.isActive,
    kind,
    value,
    minSpend: min ? Number(min[1]) * 100 : 0,
    validUntil: d.validUntil,
  };
}

export async function listStorePromotions(storeKey: string): Promise<AppPromotion[]> {
  try {
    const { body } = await apiRoot.cartDiscounts().get({
      queryArgs: { where: `stores(key="${q(storeKey)}")`, sort: 'createdAt desc', limit: 50 },
    }).execute();
    return body.results.map(toApp);
  } catch (e) {
    console.error(`[ct] listStorePromotions(${storeKey}) failed:`, (e as Error).message);
    return [];
  }
}

/**
 * commercetools requires sortOrder to be a decimal in (0,1), unique across cart discounts, and it
 * must not end in a zero — the validator rejects a trailing zero outright.
 */
function sortOrder(): string {
  const s = (Math.random() * 0.9 + 0.05).toFixed(10).replace(/0+$/, '');
  return s.endsWith('.') ? `${s}5` : s;
}

export interface CreatePromoInput {
  name: string;
  kind: PromoKind;
  /** percent (1-90) or euros (not minor units) */
  value: number;
  minSpendEur: number;
  days: number;
}

export async function createStorePromotion(storeKey: string, input: CreatePromoInput): Promise<AppPromotion | { error: string }> {
  const name = input.name.trim().slice(0, 80);
  if (!name) return { error: 'name_required' };
  if (input.kind === 'percent-off-cart' && (input.value < 1 || input.value > 90)) return { error: 'bad_percent' };
  if (input.kind === 'amount-off-cart' && input.value < 1) return { error: 'bad_amount' };

  const validUntil = new Date(Date.now() + Math.max(1, Math.min(input.days, 365)) * 86400000).toISOString();
  const minSpend = Math.max(0, Math.round(input.minSpendEur));

  const draft: CartDiscountDraft = {
    name: { [DISPLAY_LOCALE]: name, en: name },
    // scoping the discount to this store is what keeps one cave's promotion out of another's carts
    stores: [{ typeId: 'store', key: storeKey }],
    value: input.kind === 'percent-off-cart'
      ? { type: 'relative', permyriad: Math.round(input.value * 100) }
      : { type: 'absolute', money: [{ currencyCode: CURRENCY, centAmount: Math.round(input.value * 100) }] },
    cartPredicate: minSpend > 0 ? `totalPrice >= "${minSpend} ${CURRENCY}"` : '1=1',
    target: { type: 'lineItems', predicate: '1=1' },
    sortOrder: sortOrder(),
    isActive: true,
    requiresDiscountCode: false,
    validFrom: new Date().toISOString(),
    validUntil,
  };

  try {
    const { body } = await apiRoot.cartDiscounts().post({ body: draft }).execute();
    return toApp(body);
  } catch (e) {
    console.error('[ct] createStorePromotion failed:', (e as Error).message);
    return { error: (e as Error).message };
  }
}

/** Toggle or delete, refusing anything that is not this store's promotion. */
async function ownedBy(storeKey: string, id: string): Promise<CartDiscount | null> {
  try {
    const { body } = await apiRoot.cartDiscounts().withId({ ID: id }).get().execute();
    return (body.stores ?? []).some((s) => s.key === storeKey) ? body : null;
  } catch {
    return null;
  }
}

export async function setPromotionActive(storeKey: string, id: string, isActive: boolean): Promise<boolean> {
  const d = await ownedBy(storeKey, id);
  if (!d) return false;
  try {
    await apiRoot.cartDiscounts().withId({ ID: id })
      .post({ body: { version: d.version, actions: [{ action: 'changeIsActive', isActive }] } }).execute();
    return true;
  } catch (e) {
    console.error('[ct] setPromotionActive failed:', (e as Error).message);
    return false;
  }
}

export async function deletePromotion(storeKey: string, id: string): Promise<boolean> {
  const d = await ownedBy(storeKey, id);
  if (!d) return false;
  try {
    await apiRoot.cartDiscounts().withId({ ID: id }).delete({ queryArgs: { version: d.version } }).execute();
    return true;
  } catch (e) {
    console.error('[ct] deletePromotion failed:', (e as Error).message);
    return false;
  }
}
