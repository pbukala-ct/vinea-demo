import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStoreContextOrNull } from '@/lib/session';
import { getCart, mapCart } from '@/lib/ct/cart';
import { CartLines } from '@/components/CartLines';
import { money } from '@/lib/format';

export const metadata: Metadata = { title: 'Panier' };

export default async function Panier() {
  const ctx = await getStoreContextOrNull();
  if (!ctx) redirect('/choisir-ma-cave');
  const raw = await getCart(ctx);
  const cart = raw ? mapCart(raw) : null;

  if (!cart || !cart.lineItems.length) {
    return (
      <div className="mx-auto max-w-[1240px] px-5 py-24 text-center">
        <h1 className="text-4xl">Votre panier est vide</h1>
        <p className="mt-3 text-muted">Il n’y a rien pour l’instant dans votre panier {ctx.store.programme.city}.</p>
        <Link href="/catalogue" className="mt-8 inline-block bg-bordeaux text-white px-6 py-3.5 text-sm font-medium hover:bg-bordeaux-dark">
          Explorer la cave
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-10">
      <h1 className="text-4xl">Votre panier</h1>
      <p className="mt-2 text-sm text-muted">
        Chez {ctx.store.name} · {cart.itemCount} article{cart.itemCount > 1 ? 's' : ''}
      </p>

      <div className="mt-8 grid lg:grid-cols-[1fr_340px] gap-10 items-start">
        <CartLines cart={cart} />

        <aside className="bg-surface border border-line p-6 lg:sticky lg:top-6">
          <h2 className="eyebrow">Récapitulatif</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <Row label="Sous-total" value={money(cart.subtotal)} />
            {cart.savings > 0 ? <Row label="Économies" value={`− ${money(cart.savings)}`} accent /> : null}
            <Row label="Livraison" value="Choisie à l’étape suivante" muted />
          </dl>
          <div className="mt-4 pt-4 rule flex items-baseline justify-between">
            <span className="font-display text-lg">Total TTC</span>
            <span className="font-display text-2xl">{money(cart.total)}</span>
          </div>
          {cart.taxIncluded ? (
            <p className="mt-1 text-xs text-muted">dont TVA {money(cart.taxIncluded)}</p>
          ) : (
            // In Platform tax mode commercetools resolves the rate from the shipping address, so
            // there is no VAT breakdown until checkout. Prices are already TTC, so say that
            // plainly rather than deriving a figure the platform has not calculated.
            <p className="mt-1 text-xs text-muted">Prix TTC · détail de la TVA à l’étape suivante</p>
          )}
          <Link
            href="/commande"
            className="mt-6 block text-center bg-bordeaux text-white py-3.5 text-sm font-medium hover:bg-bordeaux-dark"
          >
            Passer commande
          </Link>
          <Link href="/catalogue" className="mt-3 block text-center text-sm text-muted underline underline-offset-2">
            Continuer mes achats
          </Link>
        </aside>
      </div>
    </div>
  );
}

const Row = ({ label, value, muted, accent }: { label: string; value: string; muted?: boolean; accent?: boolean }) => (
  <div className="flex justify-between gap-4">
    <dt className="text-muted">{label}</dt>
    <dd className={accent ? 'text-bordeaux font-medium' : muted ? 'text-muted text-xs self-center' : ''}>{value}</dd>
  </div>
);
