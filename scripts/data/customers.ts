/**
 * Sample shoppers. Deliberately GLOBAL customers (no `stores`), because in this model one account
 * shops any cave in the network — that is the single-view-of-customer story. Verified: the in-store
 * sign-in endpoint accepts a global customer, so login still happens in the cave's context.
 *
 * Camille holds orders from TWO caves on purpose: her account page then shows a network-wide
 * history, which is the point a franchise prospect asks about.
 */
export interface CustomerDef {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  street: string;
  postalCode: string;
  city: string;
  phone: string;
  /** existing seeded orders to reassign to this customer: storeKey → how many */
  claimOrders: Record<string, number>;
}

export const DEMO_PASSWORD = 'bellevin2026';

export const CUSTOMERS: CustomerDef[] = [
  {
    email: 'camille.rousseau@example.fr',
    password: DEMO_PASSWORD,
    firstName: 'Camille', lastName: 'Rousseau',
    street: '18 rue des Dames', postalCode: '75017', city: 'Paris',
    phone: '+33 6 12 44 08 31',
    claimOrders: { 'bellevin-paris-batignolles': 4, 'bellevin-lyon-croix-rousse': 2 },
  },
  {
    email: 'theo.marchand@example.fr',
    password: DEMO_PASSWORD,
    firstName: 'Théo', lastName: 'Marchand',
    street: '9 cours de Verdun', postalCode: '33000', city: 'Bordeaux',
    phone: '+33 6 77 20 55 14',
    claimOrders: { 'bellevin-bordeaux-chartrons': 3 },
  },
];
