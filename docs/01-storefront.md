# 01 — Storefront

The Cave Bellevin storefront: Next.js 16 App Router, Tailwind v4, all commercetools access behind a
server-only BFF. Single brand, so there is no `[banner]` route segment.

## Run it

```bash
cd site && npm install && npm run dev     # http://localhost:3000
```

Credentials come from `site/.env.local`. **`.env.local` is authoritative for `CTP_*`** — see
"The wrong-project footgun" below.

## Routes

| Route | What it is |
|---|---|
| `/` | Homepage. Store-aware: without a store it explains the model and asks you to pick one; with a store it shows that caviste's category counts, real promotions and store card. |
| `/choisir-ma-cave` | Store picker — the entry point. Shows tier, capabilities, owner, and DRAFT stores as "bientôt" (disabled). |
| `/catalogue` | Full PLP for the selected store; also the search results page. |
| `/c/[key]` | Category PLP. Root categories work via `categoriesSubTree`. |
| `/produit/[slug]` | PDP: promo pricing, availability, fiche technique, same-family rail. |
| `/panier` · `/commande` · `/commande/[id]` | Cart, checkout, confirmation. |
| `/nos-cavistes` | The network grouped by franchisee owner — the opt-in model made visible. |
| `/devenir-caviste` | The tier ladder, rendered live from the `programme-tiers` custom objects. |
| `/api/store/select` · `/api/cart` · `/api/checkout` | BFF. The browser never calls commercetools. |

## How store scoping works

One cookie (`bellevin-store`, HttpOnly) holds the store key. `lib/session.ts` resolves it into a
`StoreContext` = the Store plus its resolved programme tier. Everything derives from that:

- **Range** — every search is filtered by the store's active Product Selection id.
- **Price** — `priceChannel` is the store's distribution channel, so the same SKU is €11,45 in
  Paris and €10,05 in Bordeaux.
- **Availability** — read from the store's supply channel, so "épuisé" is per-caviste.
- **Cart** — in-store carts. commercetools enforces the scope; changing store drops the cart handle
  because a cart from another store would 404 and look like a phantom empty cart.

## Tier gating

Capabilities are read from `programme-tiers`, never hardcoded. Gates are enforced **server-side**,
not merely hidden:

| | ESSENTIEL | CONNECTÉ | PREMIUM |
|---|---|---|---|
| Search box | — | yes | yes |
| Click & collect | — | yes | yes |
| Home delivery | — | — | yes |

A `?q=` at an ESSENTIEL store is ignored by `searchProducts`; a hand-crafted delivery checkout at a
non-PREMIUM store returns 403. Hiding a control is a UX choice, not a permission.

## Locales: two of them, deliberately

- `DISPLAY_LOCALE = 'fr'` — what the shopper reads. Categories and tiers are seeded in French;
  `localized()` falls back to English for products, which are English-only.
- `DATA_LOCALE = 'en'` — what we QUERY with. Product `name`/`slug` exist only in `en`, so a
  full-text search or slug lookup issued as `fr` matches nothing.

Conflating them put an English category bar next to French copy and would have broken search.

## Gotchas paid for in blood

- **Enum attributes in Product Search** are addressed as `variants.attributes.{name}.key` **with
  `fieldType: 'enum'`**. The bare path, or `.key` with `'text'`, both 400 — and a bad facet fails
  the *whole* request, so the PLP renders "no products" rather than an error.
- **Root categories need `categoriesSubTree`**, not `categories`: products hang off leaves, so
  filtering a root by `categories` returns 0.
- **`fr` grid tracks default to `minmax(auto, …)`** and an `aspect-square` image inflates its own
  minimum, starving the neighbouring column. Use `minmax(0, …)`.
- **Never swallow a commercetools error into an empty result.** Three separate bugs here presented
  as "no products" / "store not trading". Every catch now logs, and only a real 404 means absent.
- **`next/image` is `unoptimized`.** The optimiser fetches server-side in Node, and Zscaler's
  interception of the image CDN makes Node reject the certificate while browsers are fine. Optimising
  would 500 every product image on any machine behind Zscaler without `NODE_EXTRA_CA_CERTS`.
- **Promotions must exist on the per-store price.** A `was_price` on the national price alone is
  never seen, because a store context selects the channel price.

## The wrong-project footgun

Next resolves `.env.local` only for keys **absent** from `process.env`, so any `CTP_*` exported in
your shell wins. With a sibling commercetools project's env loaded, this app booted against that
project, rendered its stores, and every lookup by our keys 404'd as "not trading". `direnv` is not a
fix — its hook does not run in non-interactive shells, so `next build` inherited it too.

`lib/ct/env.ts` therefore makes `.env.local` authoritative for `CTP_*` when the file exists, falling
back to the real environment for hosted deploys. `lib/ct/client.ts` keeps a pinned-project assertion
as a backstop. Verified: `next build` succeeds with a wrong `CTP_PROJECT_KEY` deliberately exported.
