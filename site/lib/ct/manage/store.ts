import 'server-only';
import { apiRoot } from '@/lib/ct/client';

/**
 * The cave's own profile — the editable subset of `store-programme`.
 *
 * Deliberately NOT editable here: programme_tier, lifecycle_state, owner_key, banner and the feed
 * references. Those are HQ's to set (that is what the Merchant Center onboarding app is for); a
 * retailer must not be able to promote themselves to PREMIUM from their own back office.
 */
export const EDITABLE_FIELDS = [
  'street_address', 'city', 'postal_code', 'phone', 'opening_hours',
  'click_collect_enabled', 'delivery_enabled', 'delivery_radius_km', 'timeslot_capacity',
] as const;

export type EditableField = (typeof EDITABLE_FIELDS)[number];

export interface StoreProfileInput {
  street_address?: string;
  city?: string;
  postal_code?: string;
  phone?: string;
  opening_hours?: string;
  click_collect_enabled?: boolean;
  delivery_enabled?: boolean;
  delivery_radius_km?: number;
  timeslot_capacity?: number;
}

export interface SaveResult { ok: boolean; error?: string; rejected?: string[] }

/**
 * Save the profile. `allowFulfilment` reflects the tier: a cave whose tier has no click & collect
 * cannot switch it on from here, and the attempt is reported rather than silently dropped.
 */
export async function saveStoreProfile(
  storeKey: string,
  input: StoreProfileInput,
  caps: { clickCollect: boolean; delivery: boolean },
): Promise<SaveResult> {
  const rejected: string[] = [];
  const fields: Record<string, unknown> = {};

  for (const key of EDITABLE_FIELDS) {
    const v = (input as Record<string, unknown>)[key];
    if (v === undefined) continue;
    if (key === 'click_collect_enabled' && v === true && !caps.clickCollect) { rejected.push(key); continue; }
    if ((key === 'delivery_enabled' && v === true && !caps.delivery)) { rejected.push(key); continue; }
    fields[key] = v;
  }
  if (!Object.keys(fields).length) {
    return { ok: false, error: 'nothing_to_save', rejected };
  }

  try {
    const { body: store } = await apiRoot.stores().withKey({ key: storeKey }).get().execute();
    await apiRoot.stores().withKey({ key: storeKey }).post({
      body: {
        version: store.version,
        // one setCustomField action per field: setCustomType would wipe the HQ-owned fields
        actions: Object.entries(fields).map(([name, value]) => ({
          action: 'setCustomField' as const, name, value,
        })),
      },
    }).execute();
    return { ok: true, rejected };
  } catch (e) {
    console.error(`[ct] saveStoreProfile(${storeKey}) failed:`, (e as Error).message);
    return { ok: false, error: (e as Error).message, rejected };
  }
}
