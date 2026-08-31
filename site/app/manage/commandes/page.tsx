import type { Metadata } from 'next';
import { requireManageContext } from '@/lib/manage/session';
import { listStoreOrders } from '@/lib/ct/manage/orders';
import { Panel } from '@/components/manage/ui';
import { OrdersTable } from '@/components/manage/OrdersTable';
import { readQuery, buildHref } from '@/lib/query';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Commandes' };

const FILTERS = [
  { value: '', label: 'Toutes' },
  { value: 'Open', label: 'À traiter' },
  { value: 'Confirmed', label: 'Confirmées' },
  { value: 'Complete', label: 'Terminées' },
  { value: 'Cancelled', label: 'Annulées' },
];

export default async function ManageOrders({
  searchParams,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireManageContext();
  const query = readQuery(await searchParams);
  const result = await listStoreOrders(ctx.session.storeKey, {
    page: query.page ? Number(query.page) : 1,
    state: query.state,
    sort: query.sort,
    search: query.q,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Commandes</h1>
        <p className="text-sm text-muted mt-1">
          {result.total} commande{result.total === 1 ? '' : 's'} · {ctx.store.programme.city}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => {
          const on = (query.state ?? '') === f.value;
          return (
            <Link
              key={f.label}
              href={buildHref('/manage/commandes', query, { state: f.value || undefined })}
              aria-current={on ? 'true' : undefined}
              className={`text-sm px-3 py-2 border ${on ? 'bg-ink text-cream border-ink' : 'border-line bg-surface hover:border-bordeaux'}`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <Panel title="Historique" subtitle="Uniquement les commandes de votre cave">
        {result.orders.length === 0 ? (
          <p className="px-5 py-10 text-sm text-muted text-center">Aucune commande sur ce filtre.</p>
        ) : (
          <OrdersTable
            orders={result.orders.map((o) => ({
              id: o.id,
              orderNumber: o.orderNumber ?? o.id.slice(0, 8),
              date: (o.completedAt ?? o.createdAt).slice(0, 10),
              customer: [o.shippingAddress?.firstName, o.shippingAddress?.lastName].filter(Boolean).join(' ') || (o.customerEmail ?? '—'),
              email: o.customerEmail,
              items: o.lineItems.reduce((n, l) => n + l.quantity, 0),
              total: o.totalPrice.centAmount,
              state: o.orderState,
            }))}
          />
        )}
      </Panel>

      {result.pages > 1 ? (
        <div className="flex justify-center gap-2">
          {Array.from({ length: result.pages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={buildHref('/manage/commandes', query, { page: String(n) })}
              className={`px-3.5 py-2 text-sm border tabular-nums ${n === result.page ? 'bg-ink text-cream border-ink' : 'border-line bg-surface hover:border-bordeaux'}`}
            >
              {n}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
