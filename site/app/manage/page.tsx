import type { Metadata } from 'next';
import Link from 'next/link';
import { requireManageContext } from '@/lib/manage/session';
import { allStoreOrders } from '@/lib/ct/manage/orders';
import { computeMetrics } from '@/lib/ct/manage/metrics';
import { Panel, Kpi, TrendBars, TierLocked, StateChip } from '@/components/manage/ui';
import { money } from '@/lib/format';

export const metadata: Metadata = { title: 'Tableau de bord' };

export default async function ManageDashboard({ searchParams }: { searchParams: Promise<{ refuse?: string }> }) {
  const ctx = await requireManageContext();
  const { refuse } = await searchParams;

  const refusedLabel = refuse === 'assortmentControl' ? 'la gestion de gamme'
    : refuse === 'storePromotions' ? 'les promotions'
    : refuse === 'salesDashboard' ? 'le tableau de bord'
    : null;

  if (!ctx.tier.features.salesDashboard) {
    return (
      <>
        {refusedLabel ? <Refused label={refusedLabel} /> : null}
        <TierLocked
          capability="Tableau de bord des ventes"
          tierLabel={ctx.tier.labelFr || ctx.tier.label}
          explain="Le suivi du chiffre d’affaires, du panier moyen et des meilleures ventes de votre cave est inclus à partir du palier Connecté. Vos commandes restent consultables dans l’onglet Commandes."
        />
      </>
    );
  }

  const orders = await allStoreOrders(ctx.session.storeKey);
  const m = computeMetrics(orders, 30);
  const hasHistory = m.orders.current > 0 || m.orders.previous > 0;

  return (
    <div className="space-y-6">
      {refusedLabel ? <Refused label={refusedLabel} /> : null}

      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">Tableau de bord</h1>
          <p className="text-sm text-muted mt-1">30 derniers jours · {ctx.store.programme.city}</p>
        </div>
        <p className="text-xs text-muted">{orders.length} commandes au total</p>
      </div>

      {!hasHistory ? (
        <p className="bg-surface border border-line p-6 text-sm text-muted">
          Aucune commande sur la période. Les indicateurs apparaîtront dès la première vente.
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Chiffre d’affaires" value={money(m.revenue.current)} deltaPct={m.revenue.deltaPct} />
            <Kpi label="Commandes" value={String(m.orders.current)} deltaPct={m.orders.deltaPct} />
            <Kpi label="Panier moyen" value={money(m.aov.current)} deltaPct={m.aov.deltaPct} />
            <Kpi label="Bouteilles vendues" value={String(m.units.current)} deltaPct={m.units.deltaPct} />
          </div>

          <Panel title="Chiffre d’affaires par jour" subtitle="Barres = CA quotidien TTC">
            <TrendBars points={m.trend} />
          </Panel>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,1fr)] items-start">
            <Panel
              title="Meilleures ventes"
              subtitle="Sur 30 jours, dans votre cave"
              action={<Link href="/manage/gamme" className="text-xs underline underline-offset-2">Ma gamme</Link>}
            >
              <ul className="divide-y divide-line">
                {m.topProducts.map((p) => (
                  <li key={p.sku} className="flex items-center gap-4 px-5 py-3">
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm truncate">{p.name}</span>
                      <span className="block text-xs text-muted">Réf. {p.sku}</span>
                    </span>
                    <span className="text-xs text-muted tabular-nums w-16 text-right">{p.units} u.</span>
                    <span className="text-sm tabular-nums w-24 text-right">{money(p.revenue)}</span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Statut des commandes" subtitle="Sur 30 jours">
              <ul className="divide-y divide-line">
                {m.states.map((s) => (
                  <li key={s.state} className="flex items-center justify-between gap-3 px-5 py-3">
                    <StateChip state={s.state} />
                    <span className="text-sm tabular-nums">{s.count}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

const Refused = ({ label }: { label: string }) => (
  <p className="bg-gold-tint border border-gold/40 px-4 py-3 text-sm" role="status">
    {label.charAt(0).toUpperCase() + label.slice(1)} n’est pas incluse dans le palier de votre cave.
  </p>
);
