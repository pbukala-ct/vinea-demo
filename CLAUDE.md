# CLAUDE.md — Cave Bellevin demo (commercetools)

Project memory for the **Cave Bellevin / Groupe Vinéa** demo. Claude Code loads this automatically.
Keep it authoritative and concise; detail lives in `docs/`.

## What we are building
A **French liquor retail** demo on commercetools proving two things and nothing else:
1. **The retailer opt-in model** — independent cavistes join a network at a **programme tier** that
   governs what capabilities their store gets. Onboarding/off-boarding happens live in a Merchant
   Center Custom App; the storefront reads the tier and changes behaviour with no rebuild.
2. **The Stores concept on the storefront** — one brand, many independent retailers. The shopper
   picks a store; range, price and available features change accordingly.

First audience: a **French prospect**. This is a replication of the (successful) `metcash-demo`
retailer-network story, cut down to a single brand.

## Brand / naming (LOCKED 2026-08-31)
| Layer | Value |
|---|---|
| Franchisor / wholesaler (HQ) | **Groupe Vinéa** |
| Retail banner (single brand) | **Cave Bellevin** — *"Votre caviste de quartier"* |
| Store keys | `bellevin-{city}-{quartier}` e.g. `bellevin-bordeaux-chartrons` |
| Channel keys | `{store-key}-price` (distribution) · `{store-key}-supply` (inventory) |
| Product selection keys | `{store-key}-range` |
| Programme tiers | `ESSENTIEL` · `CONNECTÉ` · `PREMIUM` |
| Franchisee owners | `retailer-owners` custom objects (Maison Lefèvre SARL, Groupe Moreau Distribution, Cavistes Duval & Fils, SARL Berger Père & Fils) |

Locale `en` (with an `fr-FR` slot) · currency **EUR** · country **FR** · tax category `fr-tva` (20%).

## The eight stores
```
bellevin-paris-batignolles      34 rue Legendre, 75017 Paris           PREMIUM
bellevin-lyon-croix-rousse      12 bd de la Croix-Rousse, 69004 Lyon   PREMIUM
bellevin-bordeaux-chartrons     48 rue Notre-Dame, 33000 Bordeaux      CONNECTÉ
bellevin-lille-vieux-lille      7 rue de la Monnaie, 59000 Lille       CONNECTÉ
bellevin-marseille-vieux-port   22 quai de Rive Neuve, 13007 Marseille CONNECTÉ
bellevin-nantes-graslin         5 rue Crébillon, 44000 Nantes          ESSENTIEL
bellevin-strasbourg-dentelles   9 rue des Dentelles, 67000 Strasbourg  ESSENTIEL
bellevin-toulouse-carmes        15 place des Carmes, 31000 Toulouse    DRAFT ← onboarded live on stage
```
Toulouse stays `DRAFT` deliberately: it gives the MC onboarding app a real job during the demo.

## Golden rules (do not violate)
1. **Single commercetools Project.** Retailers are **Stores**, never separate projects.
2. **BFF pattern is non-negotiable.** The browser never calls commercetools directly. Secrets are
   server-only, never `NEXT_PUBLIC_`.
3. **The tier is data, not code.** Capabilities resolve by reading the store's `programme_tier` →
   the `programme-tiers` custom object. Never hardcode a feature matrix in the frontend.
4. **Store context scopes every read.** Catalogue, price and availability are always store-scoped.
5. **No integrations.** No Segment, Braze, Coveo, Xero/MYOB, no external discount engine, no mobile
   app, no B2B/trade pillar. If it isn't the opt-in model or the Stores story, it does not ship.

## Relationship to `metcash-demo`
`../metcash-demo` is the **reference implementation, not the base**. We ported its server spine
deliberately (`lib/ct/*`, `store-selection*`, `features.ts`, `lib/ct/manage/*`, the seed harness)
and rebuilt the UI shell. Do not copy its `[banner]` multiplexing, trade pillar or integrations.

⚠️ **Never copy rows from the Metcash dataset.** It is commercial-in-confidence, and every image
URL points at `cdn.metcash.media` with Australian appellations. We replicate the **schema and
volumes**; the ~180 SKUs are a regenerated French wine/spirits catalogue.

## Repos (two, one commercetools Project)
- **`vinea-demo`** (this repo) — storefront + BFF (`site/`), catalogue generation + seed (`scripts/`,
  `data/`), docs.
- **`vinea-onboarding-mc-app`** (sibling, planned) — Merchant Center Custom App for retailer
  onboarding. Fork of `../metcash-onboarding-mc-app`. Shares the `programme-tiers` and
  `retailer-owners` custom objects as its contract with the storefront.

## Stack
Next.js 16 (App Router), TypeScript, Tailwind v4, next-intl v4, JWT HTTP-only sessions (`jose`).
No `[banner]` route segment — single brand, so routes hang off the root.

## Tooling
- **commercetools-storefront skill** → the Next.js storefront. Its `gather-context` grounding call
  is mandatory; always let it run.
- **commercetools-platform / -data skills** → data model, product types, custom types/objects.
- **Knowledge MCP** → trust it over training data for API shapes.
- **Commerce MCP** → create + verify types/stores/products directly. Config in `.mcp.json`
  (gitignored; template at `.mcp.json.example`).

## Build order
0. CT project (EU region) + API client + this repo — **you are here**
1. Data model: `liquor` product type, `store-programme` type, `fr-tva`, category tree,
   `programme-tiers` + `retailer-owners` objects
2. Generate the French catalogue (~180 SKUs) + imagery (hybrid: ~20 generated hero renders,
   varietal-tinted SVG placeholders for the long tail)
3. Seed stores / channels / selections / prices / inventory / owners / tiers — idempotent, with a
   read-back verify and non-zero exit on failure
4. Storefront scaffold + design pass + homepage, category nav, PLP (facets), PDP
5. **Store picker + store-scoped catalogue/pricing + tier-gated features** ← the payoff
6. Cart + checkout + order confirmation (+ 18+ age gate)
7. Port the `/manage` retailer back office (dashboard, orders, assortment, promotions, store settings)
8. Fork + rebrand the MC onboarding app; onboard Toulouse live
9. Demo runbook + talk track + condensed test plan

## Conventions
- Idempotent seeding: upsert by key/SKU so re-runs never duplicate. Always end with a verify.
- Keep the pack small: ~180 SKUs, ~30 categories, 8 stores. Enough for real facets, seeds in minutes.
- Per-store price offsets are deliberate — switching store must visibly move prices.
