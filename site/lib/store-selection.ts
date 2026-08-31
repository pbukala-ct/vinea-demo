import 'server-only';
import { cookies } from 'next/headers';

/**
 * The shopper's chosen caviste, in an HttpOnly cookie.
 *
 * This is the whole "stores on the storefront" mechanism: one Store scopes range, price and
 * availability for every subsequent request. Kept out of any auth token so an anonymous shopper
 * can pick a store before doing anything else.
 */
export const STORE_COOKIE = 'bellevin-store';
const CART_COOKIE = 'bellevin-cart';
const OPTS = { httpOnly: true, sameSite: 'lax' as const, maxAge: 60 * 60 * 24 * 30, path: '/' };

export async function getSelectedStoreKey(): Promise<string | undefined> {
  return (await cookies()).get(STORE_COOKIE)?.value || undefined;
}

export async function setSelectedStore(storeKey: string): Promise<void> {
  const jar = await cookies();
  const previous = jar.get(STORE_COOKIE)?.value;
  jar.set(STORE_COOKIE, storeKey, OPTS);
  // A cart is hard-scoped to the store it was created in, so a stale handle would 404 on fetch
  // and surface as a phantom empty cart. Changing store therefore drops the cart.
  if (previous && previous !== storeKey) jar.delete(CART_COOKIE);
}

export async function clearSelectedStore(): Promise<void> {
  const jar = await cookies();
  jar.delete(STORE_COOKIE);
  jar.delete(CART_COOKIE);
}

export async function getCartId(): Promise<string | undefined> {
  return (await cookies()).get(CART_COOKIE)?.value || undefined;
}
export async function setCartId(id: string): Promise<void> {
  (await cookies()).set(CART_COOKIE, id, OPTS);
}
export async function clearCartId(): Promise<void> {
  (await cookies()).delete(CART_COOKIE);
}
