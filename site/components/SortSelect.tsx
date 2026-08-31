'use client';
import { useRouter } from 'next/navigation';
import { buildHref, type Query } from '@/lib/query';

const OPTIONS = [
  { value: '', label: 'Pertinence' },
  { value: 'price-asc', label: 'Prix croissant' },
  { value: 'price-desc', label: 'Prix décroissant' },
  { value: 'name-asc', label: 'Nom (A→Z)' },
];

export function SortSelect({ base, query }: { base: string; query: Query }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted">Trier</span>
      <select
        value={query.sort ?? ''}
        onChange={(e) => router.push(buildHref(base, query, { sort: e.target.value || undefined }))}
        className="border border-line bg-surface px-2.5 py-2 text-sm"
      >
        {OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
