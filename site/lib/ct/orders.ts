import 'server-only';
import type { Order } from '@commercetools/platform-sdk';
import { apiRoot } from './client';
import { localized } from '@/lib/format';
import { DISPLAY_LOCALE } from '@/lib/constants';
import { clearCartId } from '@/lib/store-selection';
import type { StoreContext } from '@/lib/session';

const inStore = (storeKey: string) => apiRoot.inStoreKeyWithStoreKeyValue({ storeKey });

export interface AppOrder {
  id: string;
  orderNumber?: string;
  createdAt: string;
  storeKey?: string;
  email?: string;
  shippingName?: string;
  total: number;
  taxIncluded?: number;
  lines: { name: string; sku: string; quantity: number; lineTotal: number; image?: string }[];
  address?: { firstName?: string; lastName?: string; streetName?: string; postalCode?: string; city?: string };
}

export function mapOrder(o: Order): AppOrder {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    createdAt: o.createdAt,
    storeKey: o.store?.key,
    email: o.customerEmail,
    shippingName: o.shippingInfo?.shippingMethodName,
    total: o.totalPrice.centAmount,
    taxIncluded: o.taxedPrice?.totalTax?.centAmount,
    lines: o.lineItems.map((li) => ({
      name: localized(li.name as Record<string, string>, DISPLAY_LOCALE) || li.variant?.sku || '',
      sku: li.variant?.sku ?? '',
      quantity: li.quantity,
      lineTotal: li.totalPrice.centAmount,
      image: li.variant?.images?.[0]?.url,
    })),
    address: o.shippingAddress,
  };
}

/** Turn the cart into an order, in the store's scope, and drop the cart handle. */
export async function placeOrder(ctx: StoreContext, cartId: string, version: number): Promise<Order> {
  const res = await inStore(ctx.store.key).orders().post({
    body: { cart: { typeId: 'cart', id: cartId }, version, orderNumber: `CB-${Date.now().toString(36).toUpperCase()}` },
  }).execute();
  await clearCartId();
  return res.body;
}

export async function orderById(id: string): Promise<AppOrder | null> {
  try {
    const res = await apiRoot.orders().withId({ ID: id }).get().execute();
    return mapOrder(res.body);
  } catch {
    return null;
  }
}
