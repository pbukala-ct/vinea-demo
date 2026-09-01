import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/session';
import { clearCartId } from '@/lib/store-selection';

export async function POST() {
  // drop the cart handle too: it may be the customer's cart, which the next shopper must not see
  await clearSessionCookie();
  await clearCartId();
  return NextResponse.json({ ok: true });
}
