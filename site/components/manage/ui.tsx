import Link from 'next/link';

export function Panel({ title, subtitle, children, action }: {
  title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <section className="bg-surface border border-line">
      <header className="flex items-start justify-between gap-4 px-5 py-4 border-b border-line">
        <div>
          <h2 className="font-display text-lg leading-tight">{title}</h2>
          {subtitle ? <p className="text-xs text-muted mt-0.5">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Kpi({ label, value, deltaPct, hint }: {
  label: string; value: string; deltaPct?: number | null; hint?: string;
}) {
  const up = (deltaPct ?? 0) > 0;
  const flat = deltaPct == null || Math.abs(deltaPct) < 0.5;
  return (
    <div className="bg-surface border border-line p-5">
      <p className="eyebrow">{label}</p>
      <p className="font-display text-3xl mt-2 tabular-nums">{value}</p>
      {deltaPct != null ? (
        <p className={`text-xs mt-1.5 ${flat ? 'text-muted' : up ? 'text-sage' : 'text-bordeaux'}`}>
          {flat ? '—' : `${up ? '▲' : '▼'} ${Math.abs(deltaPct).toFixed(0)} %`}
          <span className="text-muted"> vs période précédente</span>
        </p>
      ) : hint ? (
        <p className="text-xs mt-1.5 text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/** Bar chart in pure CSS — no chart dependency for one sparkline-grade view. */
export function TrendBars({ points }: { points: { date: string; revenue: number; orders: number }[] }) {
  const max = Math.max(1, ...points.map((p) => p.revenue));
  return (
    <div className="px-5 py-5">
      <div className="flex items-end gap-[3px] h-40" role="img" aria-label="Chiffre d’affaires par jour">
        {points.map((p) => (
          <div
            key={p.date}
            title={`${p.date} · ${(p.revenue / 100).toFixed(2)} € · ${p.orders} commande(s)`}
            className="flex-1 bg-bordeaux/85 hover:bg-bordeaux transition-colors min-h-[2px]"
            style={{ height: `${Math.max(1, (p.revenue / max) * 100)}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-muted mt-2">
        <span>{points[0]?.date}</span>
        <span>{points[points.length - 1]?.date}</span>
      </div>
    </div>
  );
}

/** Shown where a surface exists but the cave's tier does not include it. */
export function TierLocked({ capability, tierLabel, explain }: {
  capability: string; tierLabel: string; explain: string;
}) {
  return (
    <div className="bg-surface border border-line p-8 text-center" data-testid="tier-locked" data-capability={capability}>
      <p className="eyebrow">Non inclus dans votre palier</p>
      <h2 className="font-display text-2xl mt-2">{capability}</h2>
      <p className="mt-3 text-sm text-muted max-w-md mx-auto leading-relaxed">{explain}</p>
      <p className="mt-4 text-xs text-muted">
        Votre cave est au palier <strong className="text-ink">{tierLabel}</strong>.
      </p>
      <Link href="/devenir-caviste" className="mt-6 inline-block bg-ink text-cream px-5 py-3 text-sm">
        Comparer les paliers
      </Link>
    </div>
  );
}

const STATE_FR: Record<string, string> = {
  Open: 'À traiter', Confirmed: 'Confirmée', Complete: 'Terminée', Cancelled: 'Annulée',
};
const STATE_STYLE: Record<string, string> = {
  Open: 'text-gold border-gold/40 bg-gold-tint',
  Confirmed: 'text-ink-soft border-line bg-cream-deep',
  Complete: 'text-sage border-sage/30 bg-sage/5',
  Cancelled: 'text-bordeaux border-bordeaux/20 bg-bordeaux-tint',
};

export function StateChip({ state }: { state?: string }) {
  const s = state ?? 'Unknown';
  return (
    <span className={`text-[11px] px-2 py-0.5 border whitespace-nowrap ${STATE_STYLE[s] ?? 'text-muted border-line'}`}>
      {STATE_FR[s] ?? s}
    </span>
  );
}

export const stateLabel = (s?: string) => STATE_FR[s ?? ''] ?? s ?? '—';
