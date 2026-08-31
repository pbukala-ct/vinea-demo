/**
 * Mint a back-office session cookie for scripted testing.
 *
 * /manage/login is a Server Action, so it cannot be driven with a plain form POST — actions need
 * Next's own encoding. Minting the cookie exercises the real verification path in
 * lib/manage/session.ts (same secret, same claims) without faking a session.
 *
 * Signs HS256 with node:crypto rather than pulling `jose` into the root package — the JWT the
 * storefront verifies is a plain HMAC, and the seed tooling has no dependencies by design.
 *
 * Usage: node scripts/dev/mint-manage-cookie.ts bellevin-paris-batignolles
 */
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, ct } from '../lib/ct.ts';

const storeKey = process.argv[2];
if (!storeKey) { console.error('usage: mint-manage-cookie.ts <storeKey>'); process.exit(1); }

const b64url = (b: Buffer | string) =>
  Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

function siteSecret(): string {
  for (let line of readFileSync(join(ROOT, 'site', '.env.local'), 'utf8').split('\n')) {
    line = line.trim();
    if (line.startsWith('SESSION_SECRET=')) return line.slice('SESSION_SECRET='.length).replace(/^['"]|['"]$/g, '');
  }
  throw new Error('SESSION_SECRET not found in site/.env.local');
}

const store = await ct('GET', `/stores/key=${storeKey}`);
if (!store.ok) { console.error(`no such store: ${storeKey}`); process.exit(1); }

const now = Math.floor(Date.now() / 1000);
const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
const payload = b64url(JSON.stringify({
  storeKey,
  storeName: store.body.name?.fr ?? store.body.name?.en ?? storeKey,
  city: store.body.custom?.fields?.city ?? '',
  adminName: 'Responsable de cave',
  iat: now,
  exp: now + 12 * 3600,
}));
const sig = b64url(createHmac('sha256', siteSecret()).update(`${header}.${payload}`).digest());

process.stdout.write(`${header}.${payload}.${sig}`);
