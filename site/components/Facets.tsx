import Link from 'next/link';
import type { FacetGroup } from '@/lib/ct/search';
import { buildHref, type Query } from '@/lib/query';

const PRICE_BANDS: { label: string; min?: number; max?: number }[] = [
  { label: 'Moins de 10 €', max: 999 },
  { label: '10 € – 20 €', min: 1000, max: 1999 },
  { label: '20 € – 40 €', min: 2000, max: 3999 },
  { label: '40 € – 80 €', min: 4000, max: 7999 },
  { label: 'Plus de 80 €', min: 8000 },
];

const FR_LABELS: Record<string, string> = {
  producer: 'Domaine / marque', country: 'Pays', varietal: 'Cépage', format: 'Format',
  sweetness: 'Sucrosité',
};

export function Facets({ groups, base, query }: { groups: FacetGroup[]; base: string; query: Query }) {
  const active = Object.entries(query).filter(([k, v]) => v && !['page', 'sort', 'q'].includes(k));

  return (
    <aside className="w-full lg:w-60 shrink-0 space-y-7">
      {active.length ? (
        <div>
          <p className="eyebrow mb-2">Filtres actifs</p>
          <ul className="flex flex-wrap gap-1.5">
            {active.map(([k, v]) => (
              <li key={k}>
                <Link
                  href={buildHref(base, query, { [k]: undefined })}
                  className="inline-flex items-center gap-1.5 text-xs bg-bordeaux-tint text-bordeaux border border-bordeaux/20 px-2 py-1"
                >
                  {k === 'inStock' ? 'En stock' : k === 'organic' ? 'Bio' : v}
                  <span aria-hidden>×</span>
                  <span className="sr-only">Retirer le filtre</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href={base} className="mt-2 inline-block text-xs text-muted underline underline-offset-2">
            Tout effacer
          </Link>
        </div>
      ) : null}

      <FacetBlock title="Disponibilité">
        <FacetLink
          href={buildHref(base, query, { inStock: query.inStock ? undefined : '1' })}
          on={!!query.inStock}
          label="En stock dans ma cave"
        />
        <FacetLink
          href={buildHref(base, query, { organic: query.organic ? undefined : '1' })}
          on={!!query.organic}
          label="Bio"
        />
      </FacetBlock>

      <FacetBlock title="Prix">
        {PRICE_BANDS.map((b) => {
          const on = query.minPrice === String(b.min ?? '') && query.maxPrice === String(b.max ?? '');
          return (
            <FacetLink
              key={b.label}
              href={buildHref(base, query, {
                minPrice: on ? undefined : b.min != null ? String(b.min) : undefined,
                maxPrice: on ? undefined : b.max != null ? String(b.max) : undefined,
              })}
              on={on}
              label={b.label}
            />
          );
        })}
      </FacetBlock>

      {groups.map((g) => (
        <FacetBlock key={g.name} title={FR_LABELS[g.name] ?? g.label}>
          {g.buckets.slice(0, 8).map((b) => {
            const on = query[g.name] === b.term;
            return (
              <FacetLink
                key={b.term}
                href={buildHref(base, query, { [g.name]: on ? undefined : b.term })}
                on={on}
                label={b.label}
                count={b.count}
              />
            );
          })}
        </FacetBlock>
      ))}
    </aside>
  );
}

function FacetBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-2">{title}</p>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}

function FacetLink({ href, on, label, count }: { href: string; on: boolean; label: string; count?: number }) {
  return (
    <li>
      <Link
        href={href}
        aria-current={on ? 'true' : undefined}
        className={`flex items-center justify-between gap-3 text-sm py-0.5 ${on ? 'text-bordeaux font-medium' : 'text-ink-soft hover:text-bordeaux'}`}
      >
        <span className="flex items-center gap-2">
          <span className={`w-3 h-3 border shrink-0 ${on ? 'bg-bordeaux border-bordeaux' : 'border-line'}`} aria-hidden />
          <span className="truncate">{label}</span>
        </span>
        {count != null ? <span className="text-xs text-muted tabular-nums">{count}</span> : null}
      </Link>
    </li>
  );
}
