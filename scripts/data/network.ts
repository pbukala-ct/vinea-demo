/**
 * The Cave Bellevin retailer network — 8 independent cavistes under 4 franchisee owners.
 *
 * This is the demo's whole point, so the spread is deliberate:
 *  - every programme tier is represented, so tier-gating is visible by switching store;
 *  - owners hold MORE THAN ONE store, so the franchise story ("one operator, several shops,
 *    one governed identity") is demoable;
 *  - Toulouse is left DRAFT so the Merchant Center onboarding app has a real job on stage;
 *  - price offsets and range sizes differ per store, so switching store visibly changes both.
 */
export interface StoreDef {
  key: string;
  name: string;
  tier: 'ESSENTIEL' | 'CONNECTE' | 'PREMIUM';
  lifecycle: 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'OFFBOARDED';
  street: string;
  city: string;
  region: string;
  postalCode: string;
  lat: number;
  lon: number;
  phone: string;
  hours: string;
  ownerKey: string;
  /** % of each category leaf this store ranges (0 = not trading yet) */
  rangePct: number;
  /** price offset vs the national baseline, in % */
  priceOffsetPct: number;
  optInDate: string;
  activationDate: string | null;
}

export interface OwnerDef {
  key: string;
  displayName: string;
  siret: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

export const OWNERS: OwnerDef[] = [
  { key: 'maison-lefevre',  displayName: 'Maison Lefèvre SARL',          siret: '84219730500017', contactName: 'Camille Lefèvre',  contactEmail: 'camille.lefevre@maison-lefevre.fr',  contactPhone: '+33 1 42 26 18 04' },
  { key: 'groupe-moreau',   displayName: 'Groupe Moreau Distribution',   siret: '51033829100024', contactName: 'Théo Moreau',      contactEmail: 'theo.moreau@groupe-moreau.fr',       contactPhone: '+33 4 78 29 55 12' },
  { key: 'duval-et-fils',   displayName: 'Cavistes Duval & Fils',        siret: '39847201600038', contactName: 'Hélène Duval',     contactEmail: 'helene.duval@duval-fils.fr',         contactPhone: '+33 5 56 44 09 71' },
  { key: 'berger-pere-fils',displayName: 'SARL Berger Père & Fils',      siret: '77320194800011', contactName: 'Anaïs Berger',     contactEmail: 'anais.berger@berger-cavistes.fr',    contactPhone: '+33 3 88 32 41 66' },
];

export const STORES: StoreDef[] = [
  {
    key: 'bellevin-paris-batignolles', name: 'Cave Bellevin Paris Batignolles',
    tier: 'PREMIUM', lifecycle: 'ACTIVE',
    street: '34 rue Legendre', city: 'Paris', region: 'ILE_DE_FRANCE', postalCode: '75017',
    lat: 48.8869, lon: 2.3200, phone: '+33 1 42 26 18 04',
    hours: 'Mar–Sam 10h–20h · Dim 10h–13h30 · Lun fermé',
    ownerKey: 'maison-lefevre', rangePct: 100, priceOffsetPct: 10,
    optInDate: '2024-03-11', activationDate: '2024-04-02',
  },
  {
    key: 'bellevin-lyon-croix-rousse', name: 'Cave Bellevin Lyon Croix-Rousse',
    tier: 'PREMIUM', lifecycle: 'ACTIVE',
    street: '12 boulevard de la Croix-Rousse', city: 'Lyon', region: 'AUVERGNE_RHONE_ALPES', postalCode: '69004',
    lat: 45.7740, lon: 4.8320, phone: '+33 4 78 29 55 12',
    hours: 'Mar–Sam 9h30–19h30 · Dim 9h30–13h · Lun fermé',
    ownerKey: 'groupe-moreau', rangePct: 100, priceOffsetPct: 4,
    optInDate: '2024-05-06', activationDate: '2024-06-03',
  },
  {
    key: 'bellevin-bordeaux-chartrons', name: 'Cave Bellevin Bordeaux Chartrons',
    tier: 'CONNECTE', lifecycle: 'ACTIVE',
    street: '48 rue Notre-Dame', city: 'Bordeaux', region: 'NOUVELLE_AQUITAINE', postalCode: '33000',
    lat: 44.8536, lon: -0.5720, phone: '+33 5 56 44 09 71',
    hours: 'Mar–Sam 10h–19h30 · Lun 15h–19h',
    ownerKey: 'duval-et-fils', rangePct: 65, priceOffsetPct: -3,
    optInDate: '2024-09-16', activationDate: '2024-10-14',
  },
  {
    key: 'bellevin-lille-vieux-lille', name: 'Cave Bellevin Lille Vieux-Lille',
    tier: 'CONNECTE', lifecycle: 'ACTIVE',
    street: '7 rue de la Monnaie', city: 'Lille', region: 'HAUTS_DE_FRANCE', postalCode: '59000',
    lat: 50.6414, lon: 3.0635, phone: '+33 3 20 55 71 23',
    hours: 'Mar–Sam 10h–20h · Dim 10h–13h',
    ownerKey: 'maison-lefevre', rangePct: 60, priceOffsetPct: -7,
    optInDate: '2025-01-13', activationDate: '2025-02-10',
  },
  {
    key: 'bellevin-marseille-vieux-port', name: 'Cave Bellevin Marseille Vieux-Port',
    tier: 'CONNECTE', lifecycle: 'ACTIVE',
    street: '22 quai de Rive Neuve', city: 'Marseille', region: 'PROVENCE_ALPES_COTE_DAZUR', postalCode: '13007',
    lat: 43.2930, lon: 5.3690, phone: '+33 4 91 33 62 08',
    hours: 'Lun–Sam 9h30–20h · Dim 10h–13h',
    ownerKey: 'groupe-moreau', rangePct: 62, priceOffsetPct: -1,
    optInDate: '2025-03-03', activationDate: '2025-04-07',
  },
  {
    key: 'bellevin-nantes-graslin', name: 'Cave Bellevin Nantes Graslin',
    tier: 'ESSENTIEL', lifecycle: 'ACTIVE',
    street: '5 rue Crébillon', city: 'Nantes', region: 'PAYS_DE_LA_LOIRE', postalCode: '44000',
    lat: 47.2130, lon: -1.5600, phone: '+33 2 40 73 11 49',
    hours: 'Mar–Sam 10h–19h',
    ownerKey: 'duval-et-fils', rangePct: 35, priceOffsetPct: -12,
    optInDate: '2025-06-09', activationDate: '2025-07-01',
  },
  {
    key: 'bellevin-strasbourg-dentelles', name: 'Cave Bellevin Strasbourg Petite-France',
    tier: 'ESSENTIEL', lifecycle: 'ACTIVE',
    street: '9 rue des Dentelles', city: 'Strasbourg', region: 'GRAND_EST', postalCode: '67000',
    lat: 48.5810, lon: 7.7420, phone: '+33 3 88 32 41 66',
    hours: 'Mar–Sam 10h–19h · Dim fermé',
    ownerKey: 'berger-pere-fils', rangePct: 32, priceOffsetPct: 2,
    optInDate: '2025-09-08', activationDate: '2025-10-06',
  },
  {
    // Deliberately not trading: onboarded live in the Merchant Center app during the demo.
    key: 'bellevin-toulouse-carmes', name: 'Cave Bellevin Toulouse Carmes',
    tier: 'CONNECTE', lifecycle: 'DRAFT',
    street: '15 place des Carmes', city: 'Toulouse', region: 'OCCITANIE', postalCode: '31000',
    lat: 43.5960, lon: 1.4450, phone: '+33 5 61 52 88 30',
    hours: 'Mar–Sam 10h–19h30',
    ownerKey: 'groupe-moreau', rangePct: 0, priceOffsetPct: 5,
    optInDate: '2026-08-24', activationDate: null,
  },
];

export const priceChannelKey  = (storeKey: string) => `${storeKey}-price`;
export const supplyChannelKey = (storeKey: string) => `${storeKey}-supply`;
export const selectionKey     = (storeKey: string) => `${storeKey}-range`;

/** Tier drives fulfilment capability — kept consistent with data/tiers.ts. */
export function fulfilment(s: StoreDef) {
  const active = s.lifecycle === 'ACTIVE';
  return {
    clickCollect: active && (s.tier === 'CONNECTE' || s.tier === 'PREMIUM'),
    delivery: active && s.tier === 'PREMIUM',
    radiusKm: s.tier === 'PREMIUM' ? 8 : null,
    timeslots: s.tier === 'PREMIUM' ? 12 : s.tier === 'CONNECTE' ? 6 : null,
  };
}
