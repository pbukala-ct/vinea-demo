'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { money } from '@/lib/format';
import { StateChip } from './ui';

export interface OrderRow {
  id: string; orderNumber: string; date: string; customer: string;
  email?: string; items: number; total: number; state?: string;
}

const NEXT_STATES: Record<string, { to: string; label: string }[]> = {
  Open: [{ to: 'Confirmed', label: 'Confirmer' }, { to: 'Cancelled', label: 'Annuler' }],
  Confirmed: [{ to: 'Complete', label: 'Marquer terminée' }, { to: 'Cancelled', label: 'Annuler' }],
  Complete: [],
  Cancelled: [],
};

/**
 * Order list with state transitions. Only the transitions that are actually valid from the current
 * state are offered — a "Confirmer" button on an already-cancelled order is a control that cannot
 * succeed.
 */
export function OrdersTable({ orders }: { orders: OrderRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  async function transition(orderId: string, orderState: string) {
    setBusy(orderId);
    setError(null);
    const res = await fetch('/api/manage/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, orderState }),
    });
    setBusy(null);
    if (!res.ok) { setError('La commande n’a pas pu être mise à jour.'); return; }
    start(() => router.refresh());
  }

  return (
    <>
      {error ? <p className="px-5 pt-4 text-sm text-bordeaux" role="alert">{error}</p> : null}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-line">
              {['Commande', 'Date', 'Client', 'Articles', 'Total', 'Statut', ''].map((h) => (
                <th key={h} className="px-5 py-2.5 eyebrow font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (
              <tr key={o.id} className={busy === o.id ? 'opacity-50' : ''}>
                <td className="px-5 py-3 font-medium whitespace-nowrap">{o.orderNumber}</td>
                <td className="px-5 py-3 text-muted whitespace-nowrap tabular-nums">{o.date}</td>
                <td className="px-5 py-3">
                  <span className="block">{o.customer}</span>
                  {o.email ? <span className="block text-xs text-muted">{o.email}</span> : null}
                </td>
                <td className="px-5 py-3 tabular-nums">{o.items}</td>
                <td className="px-5 py-3 tabular-nums whitespace-nowrap">{money(o.total)}</td>
                <td className="px-5 py-3"><StateChip state={o.state} /></td>
                <td className="px-5 py-3 whitespace-nowrap text-right">
                  {(NEXT_STATES[o.state ?? ''] ?? []).map((t) => (
                    <button
                      key={t.to}
                      onClick={() => transition(o.id, t.to)}
                      disabled={busy === o.id}
                      className="ml-2 text-xs underline underline-offset-2 hover:text-bordeaux disabled:opacity-50"
                    >
                      {t.label}
                    </button>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
