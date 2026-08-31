import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { orderById } from '@/lib/ct/orders';
import { storeByKey } from '@/lib/ct/stores';
import { money } from '@/lib/format';

export const metadata: Metadata = { title: 'Commande confirmée' };

export default async function Confirmation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await orderById(id);
  if (!order) notFound();
  const store = order.storeKey ? await storeByKey(order.storeKey) : null;
  const collect = order.shippingName?.toLowerCase().includes('retrait');

  return (
    <div className="mx-auto max-w-[760px] px-5 py-14">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 grid place-items-center border border-sage text-sage rounded-full">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-4xl mt-5">Merci, c’est confirmé.</h1>
        <p className="mt-3 text-muted">
          Commande <strong className="text-ink">{order.orderNumber ?? order.id.slice(0, 8)}</strong>
          {order.email ? <> · un récapitulatif part vers {order.email}</> : null}
        </p>
      </div>

      <div className="mt-10 border border-line bg-surface p-6">
        <p className="eyebrow">{collect ? 'À retirer chez' : 'Livraison'}</p>
        {collect && store ? (
          <>
            <p className="mt-2 font-display text-xl">{store.name}</p>
            <p className="mt-1 text-sm text-ink-soft">
              {store.programme.street}, {store.programme.postalCode} {store.programme.city}
            </p>
            {store.programme.hours ? <p className="mt-1 text-sm text-muted">{store.programme.hours}</p> : null}
            <p className="mt-3 text-sm text-sage">Votre commande sera prête sous 2 heures.</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">
            {order.address?.firstName} {order.address?.lastName}<br />
            {order.address?.streetName}<br />
            {order.address?.postalCode} {order.address?.city}
          </p>
        )}
      </div>

      <ul className="mt-8 divide-y divide-line border-y border-line">
        {order.lines.map((l, i) => (
          <li key={i} className="flex items-center gap-4 py-4">
            <div className="relative w-14 h-16 shrink-0 bg-cream-deep">
              {l.image ? <Image src={l.image} alt={l.name} fill sizes="56px" className="object-contain p-1.5 mix-blend-multiply" /> : null}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug">{l.name}</p>
              <p className="text-xs text-muted mt-0.5">Quantité {l.quantity}</p>
            </div>
            <p className="text-sm shrink-0">{money(l.lineTotal)}</p>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex justify-between items-baseline">
        <span className="font-display text-lg">Total TTC</span>
        <span className="font-display text-2xl">{money(order.total)}</span>
      </div>
      {order.taxIncluded ? <p className="text-right text-xs text-muted">dont TVA {money(order.taxIncluded)}</p> : null}

      <Link href="/catalogue" className="mt-10 block text-center border border-line py-3.5 text-sm hover:border-bordeaux">
        Retourner à la cave
      </Link>
    </div>
  );
}
