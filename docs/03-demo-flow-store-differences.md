# 03 — Demo flow: proving the stores are genuinely different

A one-page script for the core claim: **one brand, one codebase, one commercetools project — and
every caviste is a different shop.** Every figure below was read off the running demo, not estimated.

Base URL is whatever `npm run dev` prints (`http://localhost:3000` by default).

---

## The three caves to use

Pick these and nothing else — they span the whole tier ladder.

| Cave | Tier | Range | Price bias | Retrait | Livraison | Back office |
|---|---|---|---|---|---|---|
| **Paris** Batignolles | PREMIUM | **499** refs | +10 % | yes | yes | all 5 tabs |
| **Bordeaux** Chartrons | CONNECTÉ | **338** refs | −3 % | yes | — | 4 tabs |
| **Nantes** Graslin | ESSENTIEL | **191** refs | −12 % | — | — | 2 tabs + 3 padlocks |

Switch cave from the black bar at the top of any page → **Changer**, or go to `/choisir-ma-cave`.

---

## Five products that do the work

Copy these URLs. Switch cave between each one.

### 1. Same bottle, seven different prices
`/produit/hennessy-vs-cognac-bottle-700ml-14559`

> "Same Hennessy, same catalogue entry, same site. The price is the caviste's."

| Paris | Lyon | Strasbourg | Marseille | Bordeaux | Lille | Nantes |
|---|---|---|---|---|---|---|
| 62,55 € | 59,15 € | 58,05 € | 56,35 € | 55,15 € | 52,95 € | **50,05 €** |

A €12,50 spread on one bottle. All TTC, TVA 20 % included.

### 2. In stock here, sold out there
`/produit/st-agnes-xo-15-year-old-brandy-700ml-bottle-990572`

| Paris | Bordeaux | Marseille |
|---|---|---|
| 108,75 € · **En stock** | 95,95 € · **Épuisé en magasin** | 97,95 € · En stock |

At Bordeaux the add-to-cart button is **disabled with the reason on it** — not an enabled button
that fails on click. Availability comes from that cave's supply channel.

### 3. Low stock caps what you can buy
`/produit/beresford-mclaren-vale-shiraz-750ml-bottle-590704` — at **Paris**

11,45 € (was 14,15 €, −19 %) · **"Plus que 1 en cave"** · quantity dropdown offers **only 1** ·
"Stock limité : 1 disponible(s)."

Two points in one: a real promotion, and a quantity picker that cannot ask for more than exists.

### 4. Not ranged at all → the page does not exist
`/produit/bollinger-rose-champagne-nv-750ml-bottle-728242`

| Paris | Bordeaux | Nantes |
|---|---|---|
| 121,95 € | 107,55 € | **404** |

> "Nantes doesn't stock Bollinger, so for Nantes this product doesn't exist. Not hidden — the URL
> 404s. Range is enforced server-side, not filtered in the browser."

165 references are ranged in Paris and Bordeaux but in neither ESSENTIEL cave.

### 5. Same promotion, different price
`/produit/jacob-s-creek-classic-riesling-750ml-bottle-528781`

On promotion in **all seven** caves, each at that cave's own price:
Paris **5,35 €** (−17 %) → Nantes **4,35 €** (−16 %).

---

## Then show it isn't only pricing

**Search is a paid capability.** `/catalogue` at Paris and Bordeaux has a search box. At **Nantes it
is absent** — ESSENTIEL is browse-by-category only. Not greyed out; not there.

**Checkout options follow the tier.** Add anything, go to `/commande`:

| | Retrait en magasin | Livraison à domicile |
|---|---|---|
| Paris (PREMIUM) | yes | yes |
| Bordeaux (CONNECTÉ) | yes | — |
| Nantes (ESSENTIEL) | — | — (says so plainly, offers to switch cave) |

Worth saying out loud: posting a delivery order to a non-PREMIUM cave by hand returns **403**. The
UI hiding a control is a courtesy; the tier is enforced in the API.

**The back office differs too.** `/manage/login` → open **Paris**: dashboard with real revenue,
range control, promotions. Open **Nantes**: same URL, **padlocks** on dashboard, gamme and
promotions, each explaining what upgrading gives.

**And it is all data.** `/devenir-caviste` renders the tier ladder live from the `programme-tiers`
custom objects. Change a tier in the Merchant Center and every screen above changes — no rebuild.

---

## Suggested 4-minute run

1. `/choisir-ma-cave` — pick **Paris**. Note 499 refs. *(20 s)*
2. Hennessy PDP → 62,55 €. Change cave to **Nantes** → 50,05 €. *(40 s)*
3. Still at Nantes: catalogue is 191 refs and **the search box is gone**. *(30 s)*
4. Bollinger URL at Nantes → **404**. Switch to Paris → 121,95 €. *(40 s)*
5. St Agnes at **Bordeaux** → sold out, button disabled. Marseille → in stock. *(30 s)*
6. Add a bottle at **Bordeaux** → `/commande` offers retrait only. Paris offers both. *(40 s)*
7. `/manage/login` → **Paris** dashboard, then **Nantes** padlocks. *(40 s)*

---

## Two things not to trip over

- **A range change takes ~30 s to reach the shop.** commercetools' Product Search index is
  eventually consistent (measured: 15–30 s). If you add a wine in `/manage/gamme`, talk through the
  promotions tab before switching to the storefront. The back office says so on screen.
- **Switching cave empties the cart.** Deliberate: a cart belongs to the cave it was created in, so
  a stale one would 404. Build the cart *after* choosing the cave you want to check out from.
