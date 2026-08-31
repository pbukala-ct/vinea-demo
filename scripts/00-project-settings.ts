/**
 * 00 — project settings.
 *
 * The project is created in the Merchant Center, which seeds it with its own defaults
 * (de-DE/en-US languages, DE/US countries). Align it with the demo: English content with a
 * French slot, EUR, France only. A French prospect must not see Germany and the United States
 * in a country picker.
 *
 * Idempotent: computes the delta and sends only the actions that change something.
 *
 * Run: npm run project:settings
 */
import { ct, err, finish, l } from './lib/ct.ts';

const TARGET = {
  name: 'Cave Bellevin',
  languages: ['en', 'fr'],
  countries: ['FR'],
  currencies: ['EUR'],
};

const same = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join() === [...b].sort().join();

const p = await ct('GET', '');
if (!p.ok) { err('read project', p); finish('project settings'); }

console.log('before:', JSON.stringify({
  name: p.body.name, languages: p.body.languages,
  countries: p.body.countries, currencies: p.body.currencies,
}));

const actions: Record<string, unknown>[] = [];
if (p.body.name !== TARGET.name) actions.push({ action: 'changeName', name: TARGET.name });
if (!same(p.body.languages ?? [], TARGET.languages)) actions.push({ action: 'changeLanguages', languages: TARGET.languages });
if (!same(p.body.countries ?? [], TARGET.countries)) actions.push({ action: 'changeCountries', countries: TARGET.countries });
if (!same(p.body.currencies ?? [], TARGET.currencies)) actions.push({ action: 'changeCurrencies', currencies: TARGET.currencies });

if (!actions.length) {
  console.log('already aligned — nothing to do');
} else {
  console.log(`applying ${actions.length} action(s): ${actions.map((a) => a.action).join(', ')}`);
  const r = await ct('POST', '', { version: p.body.version, actions });
  if (!r.ok) err('update project', r);
}

// ---- search indexing ----
// New projects ship with Product Projection Search DEACTIVATED; the PLP's facets and the
// storefront's category listings both need it. Enabling triggers a reindex — free while the
// catalogue is empty, slow once it isn't, so this belongs in phase 0.
const sIdx = await ct('GET', '');
const searchOn = sIdx.body?.searchIndexing?.products?.status;
if (searchOn === 'Activated') {
  console.log('product search indexing: already activated');
} else {
  console.log(`product search indexing: ${searchOn ?? 'unknown'} → activating`);
  const r = await ct('POST', '', {
    version: sIdx.body.version,
    actions: [{ action: 'changeProductSearchIndexingEnabled', enabled: true }],
  });
  if (!r.ok) err('enable product search indexing', r);
}

// ---- verify (read back, do not trust the write response) ----
const after = await ct('GET', '');
if (!after.ok) { err('verify read', after); finish('project settings'); }
console.log('after :', JSON.stringify({
  name: after.body.name, languages: after.body.languages,
  countries: after.body.countries, currencies: after.body.currencies,
}));

const idxStatus = after.body?.searchIndexing?.products?.status;
console.log('search    :', idxStatus);
if (idxStatus !== 'Activated' && idxStatus !== 'Indexing') {
  err('verify search indexing', { ok: false, status: 0, body: { errors: [{ message: `status ${idxStatus}, want Activated/Indexing` }] } });
}

if (after.body.name !== TARGET.name) err('verify name', { ok: false, status: 0, body: after.body.name });
for (const [field, want] of [['languages', TARGET.languages], ['countries', TARGET.countries], ['currencies', TARGET.currencies]] as const) {
  if (!same(after.body[field] ?? [], want as string[])) {
    err(`verify ${field}`, { ok: false, status: 0, body: { errors: [{ message: `got ${JSON.stringify(after.body[field])}, want ${JSON.stringify(want)}` }] } });
  }
}

// `l()` is exercised here so a locale typo surfaces in phase 0, not phase 3.
void l('Cave Bellevin', 'Cave Bellevin');

finish('project settings');
