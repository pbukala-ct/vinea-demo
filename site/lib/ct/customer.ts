import 'server-only';
import type { Customer, Order } from '@commercetools/platform-sdk';
import { apiRoot } from './client';
import { mapOrder, type AppOrder } from './orders';

/**
 * Shopper accounts.
 *
 * Sign-in goes through the CAVE (`in-store/key={storeKey}/login`) even though the customers are
 * global, so the login happens in the same store context as the cart and commercetools can adopt
 * the anonymous cart. Verified: a customer with no `stores` signs in at any cave.
 */

export interface LoginResult {
  ok: boolean;
  customer?: Customer;
  error?: 'invalid_credentials' | 'failed';
}

export async function loginInStore(
  storeKey: string,
  email: string,
  password: string,
  anonymousCartId?: string,
): Promise<LoginResult> {
  try {
    const { body } = await apiRoot.inStoreKeyWithStoreKeyValue({ storeKey }).login().post({
      body: {
        email,
        password,
        ...(anonymousCartId ? { anonymousCartId } : {}),
        // keep whatever is in the anonymous cart and merge the customer's own line items in
        updateProductData: true,
      },
    }).execute();
    return { ok: true, customer: body.customer };
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    // 400 from this endpoint is a bad email/password pair, not an outage
    if (status === 400) return { ok: false, error: 'invalid_credentials' };
    console.error(`[ct] loginInStore(${storeKey}) failed:`, (e as Error).message);
    return { ok: false, error: 'failed' };
  }
}

export async function customerById(id: string): Promise<Customer | null> {
  try {
    const { body } = await apiRoot.customers().withId({ ID: id }).get().execute();
    return body;
  } catch {
    return null;
  }
}

/**
 * The shopper's orders across the WHOLE network, not just the cave they are browsing.
 * That is the point of one account for many independent caves.
 */
export async function customerOrders(customerId: string, limit = 50): Promise<AppOrder[]> {
  try {
    const { body } = await apiRoot.orders().get({
      queryArgs: {
        where: `customerId="${customerId.replace(/"/g, '')}"`,
        sort: 'completedAt desc',
        limit,
      },
    }).execute();
    return body.results.map((o: Order) => mapOrder(o));
  } catch (e) {
    console.error(`[ct] customerOrders(${customerId}) failed:`, (e as Error).message);
    return [];
  }
}
