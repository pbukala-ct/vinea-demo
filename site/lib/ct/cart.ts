import 'server-only';
import type { Cart, CartUpdateAction, BaseAddress } from '@commercetools/platform-sdk';
import { apiRoot } from './client';
import { localized } from '@/lib/format';
import { CURRENCY, COUNTRY, DATA_LOCALE, DISPLAY_LOCALE } from '@/lib/constants';
import { getCartId, setCartId, clearCartId } from '@/lib/store-selection';
import type { StoreContext } from '@/lib/session';

/**
 * Carts are IN-STORE carts, scoped to the caviste the shopper picked.
 *
 * commercetools enforces the scope: a cart created in one store is not readable from another, which
 * is precisely the guarantee we want when a shopper switches store mid-session.
 */
const inStore = (storeKey: string) => apiRoot.inStoreKeyWithStoreKeyValue({ storeKey });

export interface AppCartLine {
  id: string;
  name: string;
  sku: string;
  slug?: string;
  quantity: number;
  unitPrice: number;
  originalUnitPrice: number;
  lineTotal: number;
  image?: string;
}

export interface AppCart {
  id: string;
  version: number;
  lineItems: AppCartLine[];
  itemCount: number;
  subtotal: number;
  originalSubtotal: number;
  savings: number;
  shippingName?: string;
  shippingCost?: number;
  total: number;
  /** VAT included in the total (French retail displays TTC) */
  taxIncluded?: number;
}

export function mapCart(cart: Cart): AppCart {
  const lineItems: AppCartLine[] = cart.lineItems.map((li) => ({
    id: li.id,
    name: localized(li.name as Record<string, string>, DISPLAY_LOCALE) || li.variant?.sku || '',
    sku: li.variant?.sku ?? '',
    slug: li.productSlug ? localized(li.productSlug as Record<string, string>, DATA_LOCALE) : undefined,
    quantity: li.quantity,
    unitPrice: (li.price.discounted?.value ?? li.price.value).centAmount,
    originalUnitPrice: li.price.value.centAmount,
    lineTotal: li.totalPrice.centAmount,
    image: li.variant?.images?.[0]?.url,
  }));
  const originalSubtotal = lineItems.reduce((n, l) => n + l.originalUnitPrice * l.quantity, 0);
  const subtotal = lineItems.reduce((n, l) => n + l.lineTotal, 0);
  return {
    id: cart.id,
    version: cart.version,
    lineItems,
    itemCount: lineItems.reduce((n, l) => n + l.quantity, 0),
    subtotal,
    originalSubtotal,
    savings: Math.max(0, originalSubtotal - subtotal),
    shippingName: cart.shippingInfo?.shippingMethodName,
    shippingCost: cart.shippingInfo?.price.centAmount,
    total: cart.totalPrice.centAmount,
    taxIncluded: cart.taxedPrice?.totalTax?.centAmount,
  };
}

async function fetchCart(storeKey: string, id: string): Promise<Cart | null> {
  try {
    const res = await inStore(storeKey).carts().withId({ ID: id }).get().execute();
    return res.body.cartState === 'Active' ? res.body : null;
  } catch {
    return null; // wrong store, deleted, or already ordered — treat as no cart
  }
}

/** The active cart for this store, or null. Never creates one (safe for read-only renders). */
export async function getCart(ctx: StoreContext): Promise<Cart | null> {
  const id = await getCartId();
  if (!id) return null;
  const cart = await fetchCart(ctx.store.key, id);
  if (!cart) await clearCartId();
  return cart;
}

export async function getOrCreateCart(ctx: StoreContext): Promise<Cart> {
  const existing = await getCart(ctx);
  if (existing) return existing;
  const res = await inStore(ctx.store.key).carts().post({
    body: {
      currency: CURRENCY,
      country: COUNTRY,
      locale: DATA_LOCALE,
      // Availability is surfaced in the UI and out-of-stock items are never offered, so there is
      // no reservation to make here. Switching this on would also fail the whole cart on a race.
      inventoryMode: 'None',
      taxMode: 'Platform',
      ...(ctx.store.supplyChannelId ? { supplyChannel: { typeId: 'channel', id: ctx.store.supplyChannelId } } : {}),
      ...(ctx.store.priceChannelId ? { distributionChannel: { typeId: 'channel', id: ctx.store.priceChannelId } } : {}),
    },
  }).execute();
  await setCartId(res.body.id);
  return res.body;
}

export async function update(ctx: StoreContext, cart: Cart, actions: CartUpdateAction[]): Promise<Cart> {
  const res = await inStore(ctx.store.key).carts().withId({ ID: cart.id })
    .post({ body: { version: cart.version, actions } }).execute();
  return res.body;
}

export async function addLine(ctx: StoreContext, sku: string, quantity = 1): Promise<Cart> {
  const cart = await getOrCreateCart(ctx);
  return update(ctx, cart, [{
    action: 'addLineItem',
    sku,
    quantity,
    // the store's channels, so the line is priced and sourced from THIS caviste
    ...(ctx.store.priceChannelId ? { distributionChannel: { typeId: 'channel', id: ctx.store.priceChannelId } } : {}),
    ...(ctx.store.supplyChannelId ? { supplyChannel: { typeId: 'channel', id: ctx.store.supplyChannelId } } : {}),
  }]);
}

export async function setLineQuantity(ctx: StoreContext, lineItemId: string, quantity: number): Promise<Cart | null> {
  const cart = await getCart(ctx);
  if (!cart) return null;
  return update(ctx, cart, [{ action: 'changeLineItemQuantity', lineItemId, quantity }]);
}

export async function setShipping(
  ctx: StoreContext,
  shippingMethodKey: string,
  address: BaseAddress,
): Promise<Cart | null> {
  const cart = await getCart(ctx);
  if (!cart) return null;
  return update(ctx, cart, [
    { action: 'setShippingAddress', address },
    { action: 'setBillingAddress', address },
    { action: 'setShippingMethod', shippingMethod: { typeId: 'shipping-method', key: shippingMethodKey } },
  ]);
}

export async function setCustomerEmail(ctx: StoreContext, email: string): Promise<Cart | null> {
  const cart = await getCart(ctx);
  if (!cart) return null;
  return update(ctx, cart, [{ action: 'setCustomerEmail', email }]);
}
