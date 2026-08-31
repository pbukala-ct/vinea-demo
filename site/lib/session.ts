import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getSelectedStoreKey } from './store-selection';
import { storeByKey, type AppStore } from './ct/stores';
import { resolveTier, type ProgrammeTier } from './features';

/**
 * The request's store context: which caviste, and therefore what the shopper can see and do.
 * Everything downstream (search, pricing, availability, cart, checkout options) derives from this.
 */
export interface StoreContext {
  store: AppStore;
  tier: ProgrammeTier;
}

export const getStoreContextOrNull = cache(async (): Promise<StoreContext | null> => {
  const key = await getSelectedStoreKey();
  if (!key) return null;
  const store = await storeByKey(key);
  if (!store || store.programme.lifecycleState !== 'ACTIVE') return null;
  return { store, tier: await resolveTier(store.programme.programmeTier) };
});

/** For surfaces that cannot render without a store. Sends the shopper to the picker. */
export async function requireStoreContext(): Promise<StoreContext> {
  const ctx = await getStoreContextOrNull();
  if (!ctx) redirect('/choisir-ma-cave');
  return ctx;
}
