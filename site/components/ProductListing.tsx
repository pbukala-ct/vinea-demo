import { searchProducts, type SearchParams } from '@/lib/ct/search';
import { ProductCard } from './ProductCard';
import { Facets } from './Facets';
import { Pagination } from './Pagination';
import { SortSelect } from './SortSelect';
import type { Query } from '@/lib/query';
import Link from 'next/link';

/** Turn URL query into typed search params. One place, so /c and /catalogue behave identically. */
export function toSearchParams(query: Query, categoryId?: string): SearchParams {
  return {
    q: query.q,
    categoryId,
    producer: query.producer,
    country: query.country,
    varietal: query.varietal,
    format: query.format,
    sweetness: query.sweetness,
    organic: query.organic === '1',
    inStockOnly: query.inStock === '1',
    minPrice: query.minPrice ? Number(query.minPrice) : undefined,
    maxPrice: query.maxPrice ? Number(query.maxPrice) : undefined,
    sort: (query.sort as SearchParams['sort']) || undefined,
    page: query.page ? Number(query.page) : 1,
  };
}

export async function ProductListing({
  title, intro, base, query, categoryId,
}: { title: string; intro?: string; base: string; query: Query; categoryId?: string }) {
  const result = await searchProducts(toSearchParams(query, categoryId));

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-10">
      <div className="mb-8">
        <h1 className="text-4xl">{title}</h1>
        {intro ? <p className="mt-2 text-muted max-w-2xl">{intro}</p> : null}
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        <Facets groups={result.facets} base={base} query={query} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4 pb-4 rule border-t-0 border-b">
            <p data-testid="result-count" data-total={result.total} className="text-sm text-muted tabular-nums">
              {result.total} {result.total === 1 ? 'référence' : 'références'}
              {result.pages > 1 ? ` · page ${result.page} / ${result.pages}` : ''}
            </p>
            <SortSelect base={base} query={query} />
          </div>

          {result.products.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-display text-2xl">Aucune bouteille ne correspond.</p>
              <p className="mt-2 text-muted text-sm">
                Cette cave ne range pas tout le catalogue du réseau. Élargissez vos filtres, ou
                essayez une autre cave.
              </p>
              <div className="mt-5 flex items-center justify-center gap-3">
                <Link href={base} className="text-sm border border-line px-4 py-2.5 hover:border-bordeaux">
                  Effacer les filtres
                </Link>
                <Link href="/choisir-ma-cave" className="text-sm bg-ink text-cream px-4 py-2.5">
                  Changer de cave
                </Link>
              </div>
            </div>
          ) : (
            <>
              <ul className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pt-6">
                {result.products.map((p) => (
                  <li key={p.id}><ProductCard product={p} /></li>
                ))}
              </ul>
              <Pagination page={result.page} pages={result.pages} base={base} query={query} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
