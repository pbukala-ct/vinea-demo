import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { storeByKey } from '@/lib/ct/stores';
import { resolveTier, type ProgrammeTier } from '@/lib/features';
import type { AppStore } from '@/lib/ct/stores';

/**
 * Retailer back-office session — DEMO auth.
 *
 * Picking a cave at /manage/login IS the sign-in: we drop a jose-signed cookie scoping every
 * manage surface to that store. There is no commercetools customer behind it, and every operator
 * is effectively store-admin. Acceptable for a demo; the as-associate API chain is the production
 * upgrade path.
 *
 * Kept in a SEPARATE cookie from the shopper's store selection so browsing as a customer and
 * administering a cave never interfere — you can be shopping Paris and managing Nantes.
 */
const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'dev-only-fallback-secret-min-32-chars!!',
);
const COOKIE = 'bellevin-manage';
const OPTS = { httpOnly: true, sameSite: 'lax' as const, maxAge: 12 * 60 * 60, path: '/' };

export interface ManageSession {
  storeKey: string;
  storeName: string;
  city: string;
  adminName: string;
}

export async function createManageToken(data: ManageSession): Promise<string> {
  return new SignJWT(data as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(SECRET);
}

export async function setManageCookie(token: string): Promise<void> {
  (await cookies()).set(COOKIE, token, OPTS);
}

export async function clearManageCookie(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function getManageSession(): Promise<ManageSession | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    const { storeKey, storeName, city, adminName } = payload as Record<string, unknown>;
    if (typeof storeKey !== 'string') return null;
    return {
      storeKey,
      storeName: typeof storeName === 'string' ? storeName : storeKey,
      city: typeof city === 'string' ? city : '',
      adminName: typeof adminName === 'string' ? adminName : 'Responsable de cave',
    };
  } catch {
    return null; // tampered or expired
  }
}

/** The manage context: who is signed in, which store, and what their tier permits. */
export interface ManageContext {
  session: ManageSession;
  store: AppStore;
  tier: ProgrammeTier;
}

export async function getManageContext(): Promise<ManageContext | null> {
  const session = await getManageSession();
  if (!session) return null;
  const store = await storeByKey(session.storeKey);
  if (!store) return null;
  return { session, store, tier: await resolveTier(store.programme.programmeTier) };
}

/** Guard for every manage surface. */
export async function requireManageContext(): Promise<ManageContext> {
  const ctx = await getManageContext();
  if (!ctx) redirect('/manage/login');
  return ctx;
}

/**
 * Guard for a TIER-GATED surface. Redirects to the dashboard rather than 403ing, because a
 * retailer following an old bookmark after a downgrade should land somewhere useful.
 */
export async function requireCapability(
  capability: keyof ProgrammeTier['features'],
): Promise<ManageContext> {
  const ctx = await requireManageContext();
  if (!ctx.tier.features[capability]) redirect('/manage?refuse=' + capability);
  return ctx;
}
