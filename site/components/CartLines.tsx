'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { AppCart } from '@/lib/ct/cart';
import { money } from '@/lib/format';

export function CartLines({ cart }: { cart: AppCart }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  async function change(lineItemId: string, quantity: number) {
    setBusy(lineItemId);
    await fetch('/api/cart', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineItemId, quantity }),
    });
    setBusy(null);
    start(() => router.refresh());
  }

  return (
    <ul className="divide-y divide-line border-y border-line">
      {cart.lineItems.map((l) => (
        <li key={l.id} className={`flex gap-5 py-5 ${busy === l.id || pending ? 'opacity-60' : ''}`}>
          <div className="relative w-20 h-24 shrink-0 bg-cream-deep">
            {l.image ? (
              <Image src={l.image} alt={l.name} fill sizes="80px" className="object-contain p-2 mix-blend-multiply" />
            ) : null}
          </div>
          <div className="flex-1 min-w-0">
            {l.slug ? (
              <Link href={`/produit/${l.slug}`} className="text-base leading-snug hover:text-bordeaux">{l.name}</Link>
            ) : (
              <p className="text-base leading-snug">{l.name}</p>
            )}
            <p className="text-xs text-muted mt-1">Réf. {l.sku}</p>
            <div className="mt-3 flex items-center gap-3">
              <label className="sr-only" htmlFor={`q-${l.id}`}>Quantité</label>
              <select
                id={`q-${l.id}`}
                value={l.quantity}
                disabled={busy === l.id}
                onChange={(e) => change(l.id, Number(e.target.value))}
                className="border border-line bg-surface px-2 py-1.5 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <button
                onClick={() => change(l.id, 0)}
                disabled={busy === l.id}
                className="text-xs text-muted underline underline-offset-2 hover:text-bordeaux"
              >
                Retirer
              </button>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-medium">{money(l.lineTotal)}</p>
            {l.originalUnitPrice > l.unitPrice ? (
              <p className="text-xs text-muted"><s>{money(l.originalUnitPrice * l.quantity)}</s></p>
            ) : null}
            <p className="text-xs text-muted mt-0.5">{money(l.unitPrice)} / unité</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
