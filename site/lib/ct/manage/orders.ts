import 'server-only';
import type { Order, OrderState } from '@commercetools/platform-sdk';
import { apiRoot } from '@/lib/ct/client';

/**
 * Store-scoped order reads and state transitions for the back office.
 *
 * EVERY read is constrained by `store(key=…)` so a manage session can only ever see its own cave's
 * orders. That predicate is the whole security model here, given the demo auth.
 */

/** Escape a value for a double-quoted CT predicate. */
const q = (v: string) => v.replace(/"/g, '');

/** Whitelisted sorts — user input must never reach CT as a raw sort expression. */
const SORTS: Record<string, string> = {
  recent: 'completedAt desc',
  oldest: 'completedAt asc',
  'total-desc': 'totalPrice.centAmount desc',
  'total-asc': 'totalPrice.centAmount asc',
};

export const ORDER_STATES: OrderState[] = ['Open', 'Confirmed', 'Complete', 'Cancelled'];

export interface OrderListResult { orders: Order[]; total: number; page: number; pages: number }

export async function listStoreOrders(
  storeKey: string,
  opts: { page?: number; pageSize?: number; state?: string; sort?: string; search?: string } = {},
): Promise<OrderListResult> {
  const pageSize = opts.pageSize ?? 20;
  const page = Math.max(1, opts.page ?? 1);
  const where = [`store(key="${q(storeKey)}")`];
  if (opts.state && ORDER_STATES.includes(opts.state as OrderState)) {
    where.push(`orderState="${q(opts.state)}"`);
  }
  if (opts.search) {
    const s = q(opts.search.trim());
    if (s) where.push(`(orderNumber="${s}" or customerEmail="${s}")`);
  }
  try {
    const { body } = await apiRoot.orders().get({
      queryArgs: {
        where: where.join(' and '),
        sort: SORTS[opts.sort ?? 'recent'] ?? SORTS.recent,
        limit: pageSize,
        offset: (page - 1) * pageSize,
        withTotal: true,
      },
    }).execute();
    const total = body.total ?? 0;
    return { orders: body.results, total, page, pages: Math.ceil(total / pageSize) };
  } catch (e) {
    console.error(`[ct] listStoreOrders(${storeKey}) failed:`, (e as Error).message);
    return { orders: [], total: 0, page, pages: 0 };
  }
}

/** Every order for a store, for the dashboard aggregators. Capped — a demo cave has hundreds. */
export async function allStoreOrders(storeKey: string, max = 500): Promise<Order[]> {
  const out: Order[] = [];
  let offset = 0;
  try {
    for (;;) {
      const { body } = await apiRoot.orders().get({
        queryArgs: {
          where: `store(key="${q(storeKey)}")`,
          sort: 'completedAt desc',
          limit: Math.min(500, max - out.length),
          offset,
          withTotal: true,
        },
      }).execute();
      out.push(...body.results);
      offset += body.results.length;
      if (!body.results.length || out.length >= Math.min(max, body.total ?? 0)) break;
    }
  } catch (e) {
    console.error(`[ct] allStoreOrders(${storeKey}) failed:`, (e as Error).message);
  }
  return out;
}

/** Read one order, refusing it if it belongs to another cave. */
export async function storeOrderById(storeKey: string, id: string): Promise<Order | null> {
  try {
    const { body } = await apiRoot.orders().withId({ ID: id }).get().execute();
    return body.store?.key === storeKey ? body : null;
  } catch {
    return null;
  }
}

export async function setOrderState(storeKey: string, id: string, orderState: OrderState): Promise<Order | null> {
  const order = await storeOrderById(storeKey, id);
  if (!order) return null; // wrong store, or gone
  const { body } = await apiRoot.orders().withId({ ID: id })
    .post({ body: { version: order.version, actions: [{ action: 'changeOrderState', orderState }] } })
    .execute();
  return body;
}
