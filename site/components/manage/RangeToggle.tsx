'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Add/remove one wine from the cave's range.
 *
 * When the tier's range ceiling is reached, the ADD control is disabled with the reason stated —
 * and the server refuses it anyway (409), so this is a courtesy rather than the enforcement point.
 */
export function RangeToggle({
  productId, ranged, atCeiling,
}: { productId: string; ranged: boolean; atCeiling: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  const blocked = !ranged && atCeiling;

  async function toggle() {
    setBusy(true); setError(null);
    const res = await fetch('/api/manage/gamme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, ranged: !ranged }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error === 'ceiling_reached' ? 'Plafond de gamme atteint.' : 'Modification impossible.');
      return;
    }
    start(() => router.refresh());
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={toggle}
        disabled={busy || blocked}
        title={blocked ? 'Plafond de gamme atteint pour votre palier' : undefined}
        className={`text-xs px-3 py-1.5 border transition-colors disabled:cursor-not-allowed ${
          ranged
            ? 'border-sage/40 bg-sage/5 text-sage hover:border-bordeaux hover:text-bordeaux'
            : blocked
              ? 'border-line text-muted'
              : 'border-line hover:border-bordeaux hover:text-bordeaux'
        }`}
      >
        {busy ? '…' : ranged ? 'En gamme ✓' : blocked ? 'Plafond atteint' : 'Ajouter'}
      </button>
      {error ? <span className="text-[11px] text-bordeaux">{error}</span> : null}
    </div>
  );
}
