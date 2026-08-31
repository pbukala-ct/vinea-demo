import 'server-only';
import { cache } from 'react';
import { apiRoot } from './ct/client';

/**
 * A programme-tier template, as stored in the `programme-tiers` custom objects.
 *
 * This is the opt-in model's contract: HQ owns the templates, the Merchant Center onboarding app
 * assigns one per store, and BOTH the storefront and the /manage back office resolve capability by
 * reading it. Never hardcode a feature matrix in the UI — a tier change has to be live on stage.
 */
export interface TierFeatures {
  productSearch: boolean;
  clickCollect: boolean;
  homeDelivery: boolean;
  personalisation: boolean;
  assortmentControl: boolean;
  storePromotions: boolean;
  salesDashboard: boolean;
}

export interface ProgrammeTier {
  label: string;
  labelFr: string;
  description: string;
  monthlyFeeEur: number;
  rangeCeiling: number | null;
  features: TierFeatures;
}

const NO_FEATURES: TierFeatures = {
  productSearch: false, clickCollect: false, homeDelivery: false, personalisation: false,
  assortmentControl: false, storePromotions: false, salesDashboard: false,
};

/**
 * Fails CLOSED: an unknown or missing tier grants nothing, including a zero range ceiling.
 *
 * `rangeCeiling` needs care. commercetools STRIPS null from custom-object values, so the
 * "unlimited" tier comes back with the key absent — and spreading it over a fail-closed default of
 * 0 silently gave the most permissive tier the most restrictive ceiling, blocking every range
 * addition at PREMIUM. So for a tier that RESOLVED, an absent ceiling means unlimited (null); only
 * a tier that failed to resolve gets 0.
 */
export const resolveTier = cache(async (tierKey: string | undefined): Promise<ProgrammeTier> => {
  const unresolved: ProgrammeTier = {
    label: tierKey ?? 'Unknown', labelFr: tierKey ?? 'Inconnu', description: '',
    monthlyFeeEur: 0, rangeCeiling: 0, features: { ...NO_FEATURES },
  };
  if (!tierKey) return unresolved;
  try {
    const res = await apiRoot.customObjects()
      .withContainerAndKey({ container: 'programme-tiers', key: tierKey })
      .get().execute();
    const v = res.body.value as Partial<ProgrammeTier>;
    return {
      ...unresolved,
      ...v,
      rangeCeiling: v.rangeCeiling ?? null,
      features: { ...NO_FEATURES, ...(v.features ?? {}) },
    };
  } catch {
    return unresolved;
  }
});

/** All tiers, for the store picker's "what each tier unlocks" display. */
export const allTiers = cache(async (): Promise<(ProgrammeTier & { key: string })[]> => {
  try {
    const res = await apiRoot.customObjects().withContainer({ container: 'programme-tiers' })
      .get({ queryArgs: { limit: 20 } }).execute();
    const order = ['ESSENTIEL', 'CONNECTE', 'PREMIUM'];
    return res.body.results
      .map((o) => ({ key: o.key, ...(o.value as ProgrammeTier) }))
      .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  } catch {
    return [];
  }
});
