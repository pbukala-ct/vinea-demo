'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem { href: string; label: string; locked: boolean }

export function ManageNav({ items }: { items: NavItem[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Back-office" className="border-b border-line bg-surface">
      <div className="mx-auto max-w-[1240px] px-5 flex gap-1 overflow-x-auto">
        {items.map((i) => {
          const active = path === i.href || (i.href !== '/manage' && path.startsWith(i.href));
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active ? 'page' : undefined}
              className={`px-3.5 py-3.5 text-sm whitespace-nowrap border-b-2 -mb-px flex items-center gap-1.5 ${
                active ? 'border-bordeaux text-bordeaux' : 'border-transparent hover:text-bordeaux'
              } ${i.locked ? 'text-muted' : ''}`}
            >
              {i.label}
              {i.locked ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-label="non inclus dans votre palier">
                  <rect x="5" y="11" width="14" height="10" rx="1.5" /><path d="M8 11V8a4 4 0 018 0v3" />
                </svg>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
