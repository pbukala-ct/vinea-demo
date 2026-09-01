# 02 — Retailer back office (`/manage`)

Every caviste gets their own store back office, from the same codebase and the same commercetools
project, scoped to their store alone.

## The five surfaces

| Surface | What it does | Tier gate |
|---|---|---|
| `/manage` | Dashboard: revenue, orders, AOV, bottles sold, 30-day trend, top sellers, order states | `salesDashboard` |
| `/manage/commandes` | The cave's orders, with valid state transitions only | none |
| `/manage/gamme` | Browse the whole network catalogue, add/remove from the cave's range, against a ceiling gauge | `assortmentControl` |
| `/manage/promotions` | Create/pause/delete the cave's own Cart Discounts | `storePromotions` |
| `/manage/magasin` | Address, hours, fulfilment toggles + a read-only membership summary | none |

Signing into Nantes (ESSENTIEL) shows padlocks on three of five tabs; Paris (PREMIUM) shows all
five. Locked surfaces stay **visible** with an explanation and a link to the tier comparison — a
retailer should be able to see what upgrading buys.

## Getting in

`/manage/login`. Two ways in from the storefront:

- **top bar, far right** — a small padlocked *Espace caviste* next to "Changer". This is a demo
  affordance: it keeps the presenter one click away instead of typing a URL on stage.
- **footer**, under *Le réseau* — where it would sit on its own in production.

The back office links back with "Voir la boutique" in its header.

## Auth (demo)

Picking a cave at `/manage/login` **is** the sign-in; a jose-signed `bellevin-manage` cookie scopes
every surface. Separate cookie from the shopper's store selection, so you can browse Paris while
administering Nantes. No commercetools customer sits behind it; the as-associate API chain is the
production upgrade path.

For scripted testing, mint a cookie rather than trying to POST the Server Action (which needs
Next's own encoding):

```bash
node scripts/dev/mint-manage-cookie.ts bellevin-paris-batignolles
curl -H "Cookie: bellevin-manage=$TOKEN" http://localhost:3000/manage
```

## Gating is enforced, not decorated

Every capability is checked **server-side in the API route**, not just hidden in the UI:

- range change at ESSENTIEL → `403`
- promotion create at CONNECTÉ → `403`
- switching on click & collect at a tier without it → `422`, and the rejected field is reported
- range add past the tier ceiling → `409`
- another cave's order id → `404` (ownership re-checked before every write)

19/19 checks cover exactly these.

## Two things worth knowing

**`null` does not survive a custom object.** commercetools strips it, so PREMIUM's unlimited
`rangeCeiling` comes back with the key *absent*. Spreading that over a fail-closed default of `0`
gave the most permissive tier the most restrictive ceiling and blocked every range addition at
PREMIUM. `resolveTier` now treats absent-on-a-resolved-tier as unlimited, and only an
*unresolved* tier gets 0. There is a seed assertion so it cannot regress silently.

**Order history is imported, not built from carts.** `createdAt` is server-assigned, so a
cart-built order is always "today" and a 30-day trend is impossible. `scripts/05-seed-orders.ts`
uses `POST /orders/import` to set `completedAt`, and the aggregators bucket on
`completedAt ?? createdAt`. Orders are built from each store's real ranged SKUs and real channel
prices, so dashboard revenue reconciles with the catalogue.

## Demo path (about 3 minutes)

1. `/manage/login` → open **Paris** (PREMIUM). Dashboard: real revenue, trend, top sellers.
2. **Ma gamme** → ceiling reads *unlimited*. Remove a wine.
3. **Promotions** → create "Foire aux vins" −15% over €60.
4. Switch to the shop, add 8 bottles → the discount applies (verified: €11,45 → €9,73/unit).
5. Back to `/manage/login` → open **Nantes** (ESSENTIEL). Same URL, three padlocks.
6. `/devenir-caviste` → the tier ladder, rendered live from the same custom objects.

Note for step 2: a range change reaches the shop in ~30s (Product Search is eventually consistent
— see docs/01). Do the promotion step in between rather than switching straight to the storefront.
