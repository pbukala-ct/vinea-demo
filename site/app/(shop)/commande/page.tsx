import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getStoreContextOrNull } from '@/lib/session';
import { getCart, mapCart } from '@/lib/ct/cart';
import { CheckoutForm, type FulfilmentOption } from '@/components/CheckoutForm';
import { money } from '@/lib/format';

export const metadata: Metadata = { title: 'Commande' };

export default async function Commande() {
  const ctx = await getStoreContextOrNull();
  if (!ctx) redirect('/choisir-ma-cave');
  const raw = await getCart(ctx);
  if (!raw || !raw.lineItems.length) redirect('/panier');
  const cart = mapCart(raw);
  const p = ctx.store.programme;

  // Options are derived from the store's programme + tier — the same source the API re-checks.
  const options: FulfilmentOption[] = [];
  if (p.clickCollect) {
    options.push({
      key: 'retrait-magasin', label: 'Retrait en magasin',
      detail: `Prêt en 2 heures chez ${ctx.store.name}`, price: 0,
    });
  }
  if (ctx.tier.features.homeDelivery && p.delivery) {
    options.push({
      key: 'livraison-standard', label: 'Livraison à domicile',
      detail: `Sous ${p.deliveryRadiusKm} km · 2 à 3 jours ouvrés · offerte dès ${money(15000)}`,
      price: 690, freeAbove: 15000,
    });
  }

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-10">
      <h1 className="text-4xl">Finaliser la commande</h1>
      <p className="mt-2 text-sm text-muted">Chez {ctx.store.name}</p>

      <div className="mt-8 grid lg:grid-cols-[1fr_340px] gap-10 items-start">
        <CheckoutForm
          options={options}
          storeName={ctx.store.name}
          storeAddress={`${p.street}, ${p.postalCode} ${p.city}`}
          subtotal={cart.subtotal}
        />

        <aside className="bg-surface border border-line p-6 lg:sticky lg:top-6">
          <h2 className="eyebrow">Votre panier</h2>
          <ul className="mt-3 space-y-2.5 text-sm">
            {cart.lineItems.map((l) => (
              <li key={l.id} className="flex justify-between gap-3">
                <span className="text-ink-soft">
                  {l.quantity} × <span className="line-clamp-1">{l.name}</span>
                </span>
                <span className="shrink-0">{money(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 pt-4 rule flex justify-between text-sm">
            <span className="text-muted">Sous-total</span>
            <span>{money(cart.subtotal)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
