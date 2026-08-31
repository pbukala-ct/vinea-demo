import { NextResponse } from 'next/server';
import type { OrderState } from '@commercetools/platform-sdk';
import { getManageContext } from '@/lib/manage/session';
import { setOrderState, ORDER_STATES } from '@/lib/ct/manage/orders';

export async function PATCH(req: Request) {
  const ctx = await getManageContext();
  if (!ctx) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  const { orderId, orderState } = await req.json().catch(() => ({}));
  if (typeof orderId !== 'string' || !ORDER_STATES.includes(orderState)) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  // setOrderState re-checks store ownership, so another cave's order id cannot be transitioned
  const order = await setOrderState(ctx.session.storeKey, orderId, orderState as OrderState);
  if (!order) return NextResponse.json({ error: 'not_found_in_store' }, { status: 404 });
  return NextResponse.json({ ok: true, orderState: order.orderState });
}
