import 'server-only';

/**
 * Pure dashboard aggregators — no I/O, so they are trivially testable and cheap to reason about.
 *
 * Buckets on `completedAt ?? createdAt`: `createdAt` is server-assigned at import time, so a
 * backdated order history only has meaningful dates in `completedAt`.
 * Cancelled orders are excluded from revenue and AOV but still counted in the state breakdown.
 */
export interface OrderLike {
  id: string;
  orderNumber?: string;
  createdAt: string;
  completedAt?: string | null;
  orderState?: string;
  customerEmail?: string;
  totalPrice?: { centAmount: number; currencyCode: string };
  lineItems?: Array<{
    name?: Record<string, string>;
    variant?: { sku?: string };
    quantity?: number;
    totalPrice?: { centAmount: number };
  }>;
}

export interface Metric { current: number; previous: number; deltaPct: number | null }
export interface TrendPoint { date: string; revenue: number; orders: number }
export interface TopProduct { name: string; sku?: string; units: number; revenue: number }

export interface DashboardMetrics {
  periodDays: number;
  revenue: Metric;
  orders: Metric;
  aov: Metric;
  units: Metric;
  trend: TrendPoint[];
  topProducts: TopProduct[];
  states: { state: string; count: number }[];
}

const when = (o: OrderLike) => new Date(o.completedAt ?? o.createdAt).getTime();
const isCancelled = (o: OrderLike) => o.orderState === 'Cancelled';
const revenueOf = (o: OrderLike) => (isCancelled(o) ? 0 : o.totalPrice?.centAmount ?? 0);
const unitsOf = (o: OrderLike) =>
  isCancelled(o) ? 0 : (o.lineItems ?? []).reduce((n, l) => n + (l.quantity ?? 0), 0);

function metric(current: number, previous: number): Metric {
  const deltaPct = previous > 0 ? ((current - previous) / previous) * 100 : null;
  return { current, previous, deltaPct };
}

export function computeMetrics(orders: OrderLike[], periodDays = 30, now = Date.now()): DashboardMetrics {
  const start = now - periodDays * 86400000;
  const prevStart = now - 2 * periodDays * 86400000;

  const inPeriod = orders.filter((o) => when(o) >= start && when(o) <= now);
  const inPrev = orders.filter((o) => when(o) >= prevStart && when(o) < start);

  const sum = (list: OrderLike[], f: (o: OrderLike) => number) => list.reduce((n, o) => n + f(o), 0);
  const live = (list: OrderLike[]) => list.filter((o) => !isCancelled(o));

  const rev = sum(inPeriod, revenueOf);
  const prevRev = sum(inPrev, revenueOf);
  const cnt = live(inPeriod).length;
  const prevCnt = live(inPrev).length;

  // daily buckets, zero-filled so the chart has no gaps
  const byDay = new Map<string, TrendPoint>();
  for (let d = periodDays - 1; d >= 0; d--) {
    const date = new Date(now - d * 86400000).toISOString().slice(0, 10);
    byDay.set(date, { date, revenue: 0, orders: 0 });
  }
  for (const o of inPeriod) {
    const date = new Date(when(o)).toISOString().slice(0, 10);
    const point = byDay.get(date);
    if (!point) continue;
    point.revenue += revenueOf(o);
    if (!isCancelled(o)) point.orders += 1;
  }

  const products = new Map<string, TopProduct>();
  for (const o of live(inPeriod)) {
    for (const l of o.lineItems ?? []) {
      const sku = l.variant?.sku ?? '—';
      const entry = products.get(sku) ?? {
        name: l.name?.en ?? l.name?.fr ?? sku, sku, units: 0, revenue: 0,
      };
      entry.units += l.quantity ?? 0;
      entry.revenue += l.totalPrice?.centAmount ?? 0;
      products.set(sku, entry);
    }
  }

  const states = new Map<string, number>();
  for (const o of inPeriod) states.set(o.orderState ?? 'Unknown', (states.get(o.orderState ?? 'Unknown') ?? 0) + 1);

  return {
    periodDays,
    revenue: metric(rev, prevRev),
    orders: metric(cnt, prevCnt),
    aov: metric(cnt ? Math.round(rev / cnt) : 0, prevCnt ? Math.round(prevRev / prevCnt) : 0),
    units: metric(sum(inPeriod, unitsOf), sum(inPrev, unitsOf)),
    trend: [...byDay.values()],
    topProducts: [...products.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    states: [...states.entries()].map(([state, count]) => ({ state, count })).sort((a, b) => b.count - a.count),
  };
}
