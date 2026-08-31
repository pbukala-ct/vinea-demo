import { NextResponse } from 'next/server';
import { getStoreContextOrNull } from '@/lib/session';
import { getCart, setShipping, setCustomerEmail } from '@/lib/ct/cart';
import { placeOrder } from '@/lib/ct/orders';

/**
 * Place the order. Fulfilment options are validated against the store's TIER here, not just hidden
 * in the UI — a retailer who has not opted into home delivery cannot have a delivery order posted
 * into their store by hand-crafting the request.
 */
export async function POST(req: Request) {
  const ctx = await getStoreContextOrNull();
  if (!ctx) return NextResponse.json({ error: 'no_store' }, { status: 409 });

  const body = await req.json().catch(() => ({}));
  const { email, method, firstName, lastName, streetName, postalCode, city } = body ?? {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'bad_email' }, { status: 400 });
  }
  if (method !== 'retrait-magasin' && method !== 'livraison-standard') {
    return NextResponse.json({ error: 'bad_method' }, { status: 400 });
  }
  if (method === 'retrait-magasin' && !ctx.store.programme.clickCollect) {
    return NextResponse.json({ error: 'click_collect_unavailable' }, { status: 403 });
  }
  if (method === 'livraison-standard' && !ctx.tier.features.homeDelivery) {
    return NextResponse.json({ error: 'delivery_unavailable' }, { status: 403 });
  }

  const cart = await getCart(ctx);
  if (!cart || !cart.lineItems.length) return NextResponse.json({ error: 'empty_cart' }, { status: 409 });

  const p = ctx.store.programme;
  // Click & collect ships to the caviste; delivery ships to the shopper.
  const address = method === 'retrait-magasin'
    ? { firstName: String(firstName ?? ''), lastName: String(lastName ?? ''), streetName: p.street, postalCode: p.postalCode, city: p.city, country: 'FR' }
    : { firstName: String(firstName ?? ''), lastName: String(lastName ?? ''), streetName: String(streetName ?? ''), postalCode: String(postalCode ?? ''), city: String(city ?? ''), country: 'FR' };

  if (method === 'livraison-standard' && (!address.streetName || !address.postalCode || !address.city)) {
    return NextResponse.json({ error: 'bad_address' }, { status: 400 });
  }

  try {
    await setCustomerEmail(ctx, email);
    const withShipping = await setShipping(ctx, method, address);
    if (!withShipping) return NextResponse.json({ error: 'cart_gone' }, { status: 409 });
    const order = await placeOrder(ctx, withShipping.id, withShipping.version);
    return NextResponse.json({ orderId: order.id, orderNumber: order.orderNumber });
  } catch (e) {
    return NextResponse.json({ error: 'order_failed', detail: (e as Error).message }, { status: 422 });
  }
}
