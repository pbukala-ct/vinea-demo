/**
 * Programme-tier templates — the opt-in model's governance layer.
 *
 * These land as `programme-tiers` custom objects. HQ (Groupe Vinéa) owns them; the MC onboarding
 * app assigns one to each store; the storefront and the /manage back office both resolve
 * capabilities by reading the store's `programme_tier` and looking the template up here.
 *
 * The whole point: a retailer's capabilities are DATA, changeable live on stage with no rebuild.
 * `rangeCeiling` = how many SKUs the retailer may range themselves (null = unlimited).
 */
export interface TierFeatures {
  productSearch: boolean;      // storefront: search + facets
  clickCollect: boolean;       // storefront: retrait en magasin
  homeDelivery: boolean;       // storefront: livraison à domicile
  personalisation: boolean;    // storefront: recommendations
  assortmentControl: boolean;  // /manage: curate own range
  storePromotions: boolean;    // /manage: run own discounts
  salesDashboard: boolean;     // /manage: KPIs
}

export interface ProgrammeTier {
  key: string;
  label: string;
  labelFr: string;
  description: string;
  descriptionFr: string;
  monthlyFeeEur: number;
  rangeCeiling: number | null;
  features: TierFeatures;
}

const NONE: TierFeatures = {
  productSearch: false, clickCollect: false, homeDelivery: false, personalisation: false,
  assortmentControl: false, storePromotions: false, salesDashboard: false,
};

export const TIERS: ProgrammeTier[] = [
  {
    key: 'ESSENTIEL',
    label: 'Essentiel', labelFr: 'Essentiel',
    description: 'A shop window on the network: browse by category. HQ curates the range and the pricing.',
    descriptionFr: "Une vitrine sur le réseau : navigation par famille. Le siège gère la gamme et les prix.",
    monthlyFeeEur: 0,
    rangeCeiling: 0,
    // Deliberately no search: the tier ladder has to be VISIBLE on the storefront, and a missing
    // search box is the most immediate way to show a retailer what opting up would buy them.
    features: { ...NONE },
  },
  {
    key: 'CONNECTE',
    label: 'Connecté', labelFr: 'Connecté',
    description: 'The retailer curates their own range, offers click & collect, and sees their own sales.',
    descriptionFr: 'Le caviste gère sa gamme, propose le retrait en magasin et suit ses ventes.',
    monthlyFeeEur: 49,
    // Max SIZE of the range the caviste manages themselves. 400 not 120: the seeded CONNECTÉ
    // stores already range 315-338, so a 120 ceiling would have put every one of them
    // permanently over limit and made the back office's range gauge nonsense on arrival.
    rangeCeiling: 400,
    features: { ...NONE, productSearch: true, clickCollect: true, assortmentControl: true, salesDashboard: true },
  },
  {
    key: 'PREMIUM',
    label: 'Premium', labelFr: 'Premium',
    description: 'Full autonomy: home delivery, the retailer’s own promotions, personalised storefront.',
    descriptionFr: 'Autonomie complète : livraison, promotions propres au magasin, vitrine personnalisée.',
    monthlyFeeEur: 149,
    rangeCeiling: null,
    features: {
      productSearch: true, clickCollect: true, homeDelivery: true, personalisation: true,
      assortmentControl: true, storePromotions: true, salesDashboard: true,
    },
  },
];

export const TIER_KEYS = TIERS.map((t) => t.key);
export const FEATURE_KEYS = Object.keys(NONE) as (keyof TierFeatures)[];
