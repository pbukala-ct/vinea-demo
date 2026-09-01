import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

/**
 * Shopper session — a jose-signed JWT holding the commercetools customer id.
 *
 * Deliberately a THIRD cookie, separate from the store selection and the back-office session: a
 * shopper's identity outlives which cave they are browsing, and the same browser may be signed in
 * as a shopper while also administering a (different) cave.
 *
 * Only the customer id and display name are in the token; everything else is read from
 * commercetools per request, so a stale cookie can never show stale customer data.
 */
const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'dev-only-fallback-secret-min-32-chars!!',
);
const COOKIE = 'bellevin-session';
const OPTS = { httpOnly: true, sameSite: 'lax' as const, maxAge: 30 * 24 * 60 * 60, path: '/' };

export interface ShopperSession {
  customerId: string;
  firstName: string;
  email: string;
}

export async function createSessionToken(data: ShopperSession): Promise<string> {
  return new SignJWT(data as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET);
}

export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(COOKIE, token, OPTS);
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function getShopperSession(): Promise<ShopperSession | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const { customerId, firstName, email } = payload as Record<string, unknown>;
    if (typeof customerId !== 'string' || typeof email !== 'string') return null;
    return { customerId, firstName: typeof firstName === 'string' ? firstName : '', email };
  } catch {
    return null;
  }
}
