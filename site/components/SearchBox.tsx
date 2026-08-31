'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export function SearchBox({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  return (
    <form
      role="search"
      onSubmit={(e) => { e.preventDefault(); router.push(q.trim() ? `/catalogue?q=${encodeURIComponent(q.trim())}` : '/catalogue'); }}
      className={`flex items-center border border-line bg-surface ${compact ? 'h-9' : 'h-11'} w-full`}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Chercher un vin, un domaine, un cépage…"
        aria-label="Chercher dans la cave"
        className="flex-1 px-3 text-sm bg-transparent outline-none placeholder:text-muted"
      />
      <button type="submit" className="px-3 text-muted hover:text-bordeaux" aria-label="Lancer la recherche">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="8.5" cy="8.5" r="5.5" /><path d="M13 13l4 4" />
        </svg>
      </button>
    </form>
  );
}
