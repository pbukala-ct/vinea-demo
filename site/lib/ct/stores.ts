import 'server-only';
import { cache } from 'react';
import { apiRoot } from './client';
import { localized } from '@/lib/format';
import { DISPLAY_LOCALE } from '@/lib/constants';

/** The store-programme custom fields — the opt-in record on each Store. */
export interface StoreProgramme {
  banner?: string;
  programmeTier?: string;
  lifecycleState?: string;
  optInDate?: string;
  activationDate?: string;
  ownerKey?: string;
  street?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  lat?: number;
  lon?: number;
  phone?: string;
  hours?: string;
  clickCollect: boolean;
  delivery: boolean;
  deliveryRadiusKm?: number;
  timeslotCapacity?: number;
}

export interface AppStore {
  id: string;
  key: string;
  name: string;
  programme: StoreProgramme;
  priceChannelId?: string;
  supplyChannelId?: string;
  productSelectionId?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapStore(s: any): AppStore {
  const f = s.custom?.fields ?? {};
  return {
    id: s.id,
    key: s.key,
    name: localized(s.name, DISPLAY_LOCALE),
    programme: {
      banner: f.banner,
      programmeTier: f.programme_tier,
      lifecycleState: f.lifecycle_state,
      optInDate: f.opt_in_date,
      activationDate: f.activation_date,
      ownerKey: f.owner_key,
      street: f.street_address,
      city: f.city,
      region: f.region,
      postalCode: f.postal_code,
      lat: f.latitude,
      lon: f.longitude,
      phone: f.phone,
      hours: f.opening_hours,
      clickCollect: !!f.click_collect_enabled,
      delivery: !!f.delivery_enabled,
      deliveryRadiusKm: f.delivery_radius_km,
      timeslotCapacity: f.timeslot_capacity,
    },
    priceChannelId: s.distributionChannels?.[0]?.id,
    supplyChannelId: s.supplyChannels?.[0]?.id,
    // only an ACTIVE selection scopes the catalogue; a DRAFT store's selection is inactive
    productSelectionId: (s.productSelections ?? []).find((ps: any) => ps.active)?.productSelection?.id,
  };
}

/** Every store in the network, including DRAFT ones (the picker shows them as "bientôt"). */
export const allStores = cache(async (): Promise<AppStore[]> => {
  const res = await apiRoot.stores().get({ queryArgs: { limit: 100 } }).execute();
  return res.body.results.map(mapStore).sort((a, b) => (a.programme.city ?? '').localeCompare(b.programme.city ?? ''));
});

/** Stores a shopper can actually buy from. */
export const tradingStores = cache(async (): Promise<AppStore[]> =>
  (await allStores()).filter((s) => s.programme.lifecycleState === 'ACTIVE'));

export const storeByKey = cache(async (key: string): Promise<AppStore | null> => {
  try {
    const res = await apiRoot.stores().withKey({ key }).get().execute();
    return mapStore(res.body);
  } catch (e) {
    // Only a genuine 404 means "no such store". Anything else (auth, wrong project, network) is an
    // infrastructure fault and must be logged — swallowing it once turned a wrong-project
    // misconfiguration into a misleading "this store is not trading" for an ACTIVE store.
    const status = (e as { statusCode?: number }).statusCode;
    if (status !== 404) console.error(`[ct] storeByKey(${key}) failed:`, (e as Error).message);
    return null;
  }
});

/** Owner registry (`retailer-owners` custom objects) — the franchisee behind each store. */
export interface Owner { key: string; displayName: string; siret?: string; contactName?: string; stores: string[] }
export const allOwners = cache(async (): Promise<Owner[]> => {
  try {
    const res = await apiRoot.customObjects().withContainer({ container: 'retailer-owners' })
      .get({ queryArgs: { limit: 100 } }).execute();
    return res.body.results.map((o) => ({ key: o.key, ...(o.value as Omit<Owner, 'key'>) }));
  } catch {
    return [];
  }
});
