'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Add-to-cart. Disabled when the item is out of stock at the selected store, with the reason
 * stated on the control — never an enabled button that fails on click.
 */
export function AddToCart({ sku, onStock, max }: { sku: string; onStock: boolean; max: number }) {
  const [qty, setQty] = useState(1);
  const [state, setState] = useState<'idle' | 'added' | 'error'>('idle');
  const [pending, start] = useTransition();
  const router = useRouter();

  const cap = Math.max(1, Math.min(max || 1, 12));

  if (!onStock || max <= 0) {
    return (
      <div className="flex flex-col gap-2">
        <button disabled className="w-full bg-line text-muted py-3.5 text-sm font-medium cursor-not-allowed">
          Épuisé en magasin
        </button>
        <p className="text-xs text-muted">
          Cet article n’est pas disponible dans la cave que vous avez choisie. Essayez une autre cave.
        </p>
      </div>
    );
  }

  async function add() {
    setState('idle');
    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku, quantity: qty }),
    });
    if (res.ok) {
      setState('added');
      start(() => router.refresh());
    } else {
      setState('error');
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        <label className="sr-only" htmlFor="qty">Quantité</label>
        <select
          id="qty"
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          className="border border-line bg-surface px-3 py-3.5 text-sm"
        >
          {Array.from({ length: cap }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <button
          onClick={add}
          disabled={pending}
          className="flex-1 bg-bordeaux hover:bg-bordeaux-dark disabled:opacity-60 text-white py-3.5 text-sm font-medium tracking-wide transition-colors"
        >
          {pending ? 'Ajout…' : 'Ajouter au panier'}
        </button>
      </div>
      {max < 4 ? <p className="text-xs text-bordeaux">Stock limité : {max} disponible(s).</p> : null}
      {state === 'added' ? (
        <p className="text-xs text-sage" role="status">Ajouté au panier.</p>
      ) : null}
      {state === 'error' ? (
        <p className="text-xs text-bordeaux" role="alert">Ajout impossible. Rechargez la page et réessayez.</p>
      ) : null}
    </div>
  );
}
