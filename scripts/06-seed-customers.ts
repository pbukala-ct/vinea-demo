/**
 * 06 — sample shoppers, so the demo has a login.
 *
 * Creates two global customers and hands them a few of the already-seeded orders (via
 * `setCustomerId` + `setCustomerEmail`) so the account page has real history on first sign-in
 * rather than an empty state.
 *
 * Idempotent: customers are upserted by email, and an order already owned by the right customer is
 * left alone.
 *
 * Run: npm run seed:customers
 */
import { ct, err, finish, all, queryIn } from './lib/ct.ts';
import { CUSTOMERS, DEMO_PASSWORD } from './data/customers.ts';

const q = (v: string) => v.replace(/"/g, '');

async function ensureCustomer(def: typeof CUSTOMERS[number]): Promise<string | null> {
  const found = await ct('GET', `/customers?where=${encodeURIComponent(`email="${q(def.email)}"`)}&limit=1`);
  if (found.ok && found.body.results?.length) {
    console.log(`  ${def.email}: exists`);
    return found.body.results[0].id;
  }
  const r = await ct('POST', '/customers', {
    email: def.email,
    password: def.password,
    firstName: def.firstName,
    lastName: def.lastName,
    addresses: [{
      firstName: def.firstName, lastName: def.lastName,
      streetName: def.street, postalCode: def.postalCode, city: def.city,
      country: 'FR', phone: def.phone,
    }],
    defaultShippingAddress: 0,
    defaultBillingAddress: 0,
    // no `stores`: a global account, shoppable at every cave in the network
  });
  if (!r.ok) { err(`customer ${def.email}`, r); return null; }
  console.log(`  ${def.email}: created`);
  return r.body.customer.id;
}

/** Give this customer some existing orders so their account page is not empty. */
async function claimOrders(def: typeof CUSTOMERS[number], customerId: string) {
  for (const [storeKey, count] of Object.entries(def.claimOrders)) {
    const r = await ct('GET', `/orders?where=${encodeURIComponent(`store(key="${q(storeKey)}")`)}&sort=completedAt desc&limit=${count * 3}`);
    if (!r.ok) { err(`orders ${storeKey}`, r); continue; }
    // prefer orders not already claimed by someone else
    const candidates = (r.body.results as any[])
      .filter((o) => !o.customerId || o.customerId === customerId)
      .slice(0, count);
    let claimed = 0;
    for (const o of candidates) {
      if (o.customerId === customerId) { claimed++; continue; }
      const u = await ct('POST', `/orders/${o.id}`, {
        version: o.version,
        actions: [
          { action: 'setCustomerId', customerId },
          { action: 'setCustomerEmail', email: def.email },
        ],
      });
      if (u.ok) claimed++; else err(`claim order ${o.orderNumber}`, u);
    }
    console.log(`    ${storeKey}: ${claimed}/${count} orders`);
  }
}

for (const def of CUSTOMERS) {
  const id = await ensureCustomer(def);
  if (id) await claimOrders(def, id);
}

// ── verify ────────────────────────────────────────────────────────────────────
console.log('\n── verify ──');
const checks: [string, () => Promise<string | null>][] = [
  ['both customers exist and are global', async () => {
    for (const def of CUSTOMERS) {
      const r = await ct('GET', `/customers?where=${encodeURIComponent(`email="${q(def.email)}"`)}&limit=1`);
      const c = r.body?.results?.[0];
      if (!c) return `${def.email} missing`;
      if ((c.stores ?? []).length) return `${def.email} is store-scoped; should be global`;
      if (!c.defaultShippingAddressId) return `${def.email} has no default address`;
    }
    return null;
  }],
  ['sign-in works, at any cave', async () => {
    for (const def of CUSTOMERS) {
      const p = await ct('POST', '/login', { email: def.email, password: def.password });
      if (!p.ok) return `project login failed for ${def.email}`;
      // the storefront signs in through the cave, so prove that path too
      for (const store of ['bellevin-paris-batignolles', 'bellevin-nantes-graslin']) {
        const s = await ct('POST', `/in-store/key=${store}/login`, { email: def.email, password: def.password });
        if (!s.ok) return `in-store login failed for ${def.email} at ${store}`;
      }
    }
    return null;
  }],
  ['wrong password is rejected', async () => {
    const r = await ct('POST', '/login', { email: CUSTOMERS[0].email, password: 'not-the-password' });
    return r.status === 400 || r.status === 401 ? null : `got ${r.status}, expected a rejection`;
  }],
  ['each customer owns orders; Camille spans two caves', async () => {
    for (const def of CUSTOMERS) {
      const c = (await ct('GET', `/customers?where=${encodeURIComponent(`email="${q(def.email)}"`)}&limit=1`)).body.results[0];
      const orders = await all('orders', `where=${encodeURIComponent(`customerId="${c.id}"`)}`);
      const want = Object.values(def.claimOrders).reduce((a, b) => a + b, 0);
      if (orders.length !== want) return `${def.email} owns ${orders.length} orders, want ${want}`;
      const caves = new Set(orders.map((o: any) => o.store?.key));
      if (Object.keys(def.claimOrders).length > 1 && caves.size < 2) {
        return `${def.email} should span ${Object.keys(def.claimOrders).length} caves, spans ${caves.size}`;
      }
      const wrongEmail = orders.filter((o: any) => o.customerEmail !== def.email);
      if (wrongEmail.length) return `${wrongEmail.length} of ${def.email}'s orders carry another email`;
    }
    return null;
  }],
];
for (const [label, check] of checks) {
  const problem = await check();
  console.log(`  ${problem ? '✗' : '✓'} ${label}${problem ? ` — ${problem}` : ''}`);
  if (problem) err(`verify ${label}`, { ok: false, status: 0, body: { errors: [{ message: problem }] } });
}
console.log(`\nsign in with any of: ${CUSTOMERS.map((c) => c.email).join(', ')}  ·  password: ${DEMO_PASSWORD}`);
finish('customers');
