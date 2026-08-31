import Link from 'next/link';
import { buildHref, type Query } from '@/lib/query';

export function Pagination({ page, pages, base, query }: { page: number; pages: number; base: string; query: Query }) {
  if (pages <= 1) return null;
  const window = 2;
  const nums: (number | '…')[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= window) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5 pt-10">
      {page > 1 ? (
        <Link href={buildHref(base, query, { page: String(page - 1) })} className="px-3 py-2 text-sm border border-line hover:border-bordeaux">
          Précédent
        </Link>
      ) : null}
      {nums.map((n, i) =>
        n === '…' ? (
          <span key={`gap${i}`} className="px-2 text-muted">…</span>
        ) : (
          <Link
            key={n}
            href={buildHref(base, query, { page: String(n) })}
            aria-current={n === page ? 'page' : undefined}
            className={`px-3.5 py-2 text-sm border tabular-nums ${n === page ? 'bg-ink text-cream border-ink' : 'border-line hover:border-bordeaux'}`}
          >
            {n}
          </Link>
        ),
      )}
      {page < pages ? (
        <Link href={buildHref(base, query, { page: String(page + 1) })} className="px-3 py-2 text-sm border border-line hover:border-bordeaux">
          Suivant
        </Link>
      ) : null}
    </nav>
  );
}
