import { NextResponse } from 'next/server';
import { getStoreContextOrNull } from '@/lib/session';
import { loginInStore } from '@/lib/ct/customer';
import { createSessionToken, setSessionCookie } from '@/lib/auth/session';
import { getCartId, setCartId } from '@/lib/store-selection';

export async function POST(req: Request) {
  const ctx = await getStoreContextOrNull();
  if (!ctx) return NextResponse.json({ error: 'no_store' }, { status: 409 });

  const { email, password } = await req.json().catch(() => ({}));
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  // hand commercetools the anonymous cart so it survives sign-in
  const anonymousCartId = await getCartId();
  const result = await loginInStore(ctx.store.key, email.trim(), password, anonymousCartId);

  if (!result.ok || !result.customer) {
    const status = result.error === 'invalid_credentials' ? 401 : 502;
    return NextResponse.json({ error: result.error }, { status });
  }

  const c = result.customer;
  await setSessionCookie(await createSessionToken({
    customerId: c.id,
    firstName: c.firstName ?? '',
    email: c.email,
  }));
  // login may have replaced the cart with the customer's own — keep the handle in step
  if (c.id) {
    const merged = (result.customer as { cart?: { id: string } }).cart?.id;
    if (merged) await setCartId(merged);
  }

  return NextResponse.json({ ok: true, firstName: c.firstName, email: c.email });
}
