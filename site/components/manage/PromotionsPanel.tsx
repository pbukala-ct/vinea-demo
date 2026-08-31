'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { money } from '@/lib/format';
import type { AppPromotion } from '@/lib/ct/manage/promotions';

/** Create, pause and delete this cave's own cart discounts. */
export function PromotionsPanel({ promotions }: { promotions: AppPromotion[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const refresh = () => start(() => router.refresh());

  async function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null); setBusy('create');
    const fd = new FormData(e.currentTarget);
    const res = await fetch('/api/manage/promotions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fd.get('name'), kind: fd.get('kind'),
        value: Number(fd.get('value')), minSpendEur: Number(fd.get('minSpendEur')), days: Number(fd.get('days')),
      }),
    });
    setBusy(null);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error === 'bad_percent' ? 'La remise doit être entre 1 et 90 %.'
        : j.error === 'name_required' ? 'Donnez un nom à votre promotion.'
        : 'Création impossible.');
      return;
    }
    (e.target as HTMLFormElement).reset();
    refresh();
  }

  async function toggle(id: string, isActive: boolean) {
    setBusy(id);
    await fetch('/api/manage/promotions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive }),
    });
    setBusy(null); refresh();
  }

  async function remove(id: string) {
    setBusy(id);
    await fetch('/api/manage/promotions', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setBusy(null); refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
      <section className="bg-surface border border-line">
        <header className="px-5 py-4 border-b border-line">
          <h2 className="font-display text-lg">Promotions de ma cave</h2>
          <p className="text-xs text-muted mt-0.5">
            Ces remises s’appliquent uniquement aux paniers de votre cave.
          </p>
        </header>
        {promotions.length === 0 ? (
          <p className="px-5 py-10 text-sm text-muted text-center">
            Aucune promotion pour l’instant. Créez-en une à droite.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {promotions.map((p) => (
              <li key={p.id} className={`flex items-center gap-4 px-5 py-4 ${busy === p.id ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {p.kind === 'percent-off-cart' ? `−${p.value} % sur le panier` : `−${money(p.value)} sur le panier`}
                    {p.minSpend > 0 ? ` · dès ${money(p.minSpend)} d’achat` : ' · sans minimum'}
                    {p.validUntil ? ` · jusqu’au ${p.validUntil.slice(0, 10)}` : ''}
                  </p>
                </div>
                <span className={`text-[11px] px-2 py-0.5 border whitespace-nowrap ${p.isActive ? 'text-sage border-sage/30 bg-sage/5' : 'text-muted border-line'}`}>
                  {p.isActive ? 'Active' : 'En pause'}
                </span>
                <button
                  onClick={() => toggle(p.id, !p.isActive)} disabled={busy === p.id}
                  className="text-xs underline underline-offset-2 hover:text-bordeaux disabled:opacity-50"
                >
                  {p.isActive ? 'Mettre en pause' : 'Activer'}
                </button>
                <button
                  onClick={() => remove(p.id)} disabled={busy === p.id}
                  className="text-xs text-muted underline underline-offset-2 hover:text-bordeaux disabled:opacity-50"
                >
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={create} className="bg-surface border border-line p-5 space-y-3">
        <h2 className="font-display text-lg">Nouvelle promotion</h2>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Nom *</span>
          <input name="name" required maxLength={80} placeholder="Foire aux vins d’automne"
            className="w-full border border-line px-3 py-2.5 text-sm" />
        </label>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Type</span>
          <select name="kind" className="w-full border border-line px-3 py-2.5 text-sm bg-surface">
            <option value="percent-off-cart">Remise en % sur le panier</option>
            <option value="amount-off-cart">Remise en € sur le panier</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs text-muted mb-1">Valeur</span>
            <input name="value" type="number" min={1} max={90} defaultValue={10} required
              className="w-full border border-line px-3 py-2.5 text-sm" />
          </label>
          <label className="block">
            <span className="block text-xs text-muted mb-1">Minimum (€)</span>
            <input name="minSpendEur" type="number" min={0} defaultValue={50}
              className="w-full border border-line px-3 py-2.5 text-sm" />
          </label>
        </div>
        <label className="block">
          <span className="block text-xs text-muted mb-1">Durée (jours)</span>
          <input name="days" type="number" min={1} max={365} defaultValue={30}
            className="w-full border border-line px-3 py-2.5 text-sm" />
        </label>
        {error ? <p className="text-sm text-bordeaux" role="alert">{error}</p> : null}
        <button type="submit" disabled={busy === 'create'}
          className="w-full bg-bordeaux hover:bg-bordeaux-dark disabled:opacity-60 text-white py-3 text-sm font-medium">
          {busy === 'create' ? 'Création…' : 'Créer la promotion'}
        </button>
        <p className="text-xs text-muted">
          Créée comme Cart Discount commercetools, limitée à votre cave.
        </p>
      </form>
    </div>
  );
}
