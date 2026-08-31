import { NextResponse } from 'next/server';
import { getStoreContextOrNull } from '@/lib/session';
import { addLine, setLineQuantity, getCart, mapCart } from '@/lib/ct/cart';

/** BFF: the browser never talks to commercetools. Every handler re-resolves the store context. */
export async function GET() {
  const ctx = await getStoreContextOrNull();
  if (!ctx) return NextResponse.json({ cart: null });
  const cart = await getCart(ctx);
  return NextResponse.json({ cart: cart ? mapCart(cart) : null });
}

export async function POST(req: Request) {
  const ctx = await getStoreContextOrNull();
  if (!ctx) return NextResponse.json({ error: 'no_store' }, { status: 409 });
  const { sku, quantity } = await req.json().catch(() => ({}));
  if (typeof sku !== 'string' || !sku) return NextResponse.json({ error: 'bad_sku' }, { status: 400 });
  try {
    const cart = await addLine(ctx, sku, Math.max(1, Math.min(Number(quantity) || 1, 24)));
    return NextResponse.json({ cart: mapCart(cart) });
  } catch (e) {
    // most likely: the sku is not in this store's selection, or has no price in this channel
    return NextResponse.json({ error: 'add_failed', detail: (e as Error).message }, { status: 422 });
  }
}

export async function PATCH(req: Request) {
  const ctx = await getStoreContextOrNull();
  if (!ctx) return NextResponse.json({ error: 'no_store' }, { status: 409 });
  const { lineItemId, quantity } = await req.json().catch(() => ({}));
  if (typeof lineItemId !== 'string') return NextResponse.json({ error: 'bad_line' }, { status: 400 });
  try {
    const cart = await setLineQuantity(ctx, lineItemId, Math.max(0, Math.min(Number(quantity) || 0, 24)));
    return NextResponse.json({ cart: cart ? mapCart(cart) : null });
  } catch (e) {
    return NextResponse.json({ error: 'update_failed', detail: (e as Error).message }, { status: 422 });
  }
}
