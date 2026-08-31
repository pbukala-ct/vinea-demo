import Link from 'next/link';
import type { CatNode } from '@/lib/ct/categories';

/**
 * Two-level category bar, built from the store-scoped tree. Nodes with no stock in the selected
 * store are already pruned upstream, so every link here leads somewhere with products.
 */
export function CategoryNav({ tree }: { tree: CatNode[] }) {
  if (!tree.length) return null;
  return (
    <nav aria-label="Catégories" className="bg-surface border-b border-line">
      <div className="mx-auto max-w-[1240px] px-5">
        <ul className="flex items-stretch gap-1 overflow-x-auto">
          {tree.map((root) => (
            <li key={root.id} className="group relative shrink-0">
              <Link
                href={`/c/${root.key}`}
                className="flex items-center gap-1.5 px-3 py-3.5 text-sm hover:text-bordeaux whitespace-nowrap"
              >
                {root.label}
                {root.children.length ? (
                  <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                    <path d="M2 3.5L5 6.5l3-3" />
                  </svg>
                ) : null}
              </Link>
              {root.children.length ? (
                <div className="absolute left-0 top-full z-20 hidden group-hover:block group-focus-within:block min-w-[240px] bg-surface border border-line shadow-lg">
                  <ul className="py-1.5">
                    {root.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          href={`/c/${child.key}`}
                          className="flex items-center justify-between gap-4 px-4 py-2 text-sm hover:bg-cream-deep hover:text-bordeaux"
                        >
                          {child.label}
                          <span className="text-xs text-muted">{child.count}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
