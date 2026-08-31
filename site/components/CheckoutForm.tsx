'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { money } from '@/lib/format';

export interface FulfilmentOption {
  key: 'retrait-magasin' | 'livraison-standard';
  label: string;
  detail: string;
  price: number;
  freeAbove?: number;
}

/**
 * Checkout. Only fulfilment options the store's tier actually supports are rendered — an
 * ESSENTIEL caviste offers neither, so the form says so plainly instead of showing options that
 * would be rejected on submit.
 */
export function CheckoutForm({
  options, storeName, storeAddress, subtotal,
}: { options: FulfilmentOption[]; storeName: string; storeAddress: string; subtotal: number }) {
  const router = useRouter();
  const [method, setMethod] = useState<FulfilmentOption['key'] | ''>(options[0]?.key ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!options.length) {
    return (
      <div className="border border-line bg-surface p-6">
        <p className="font-medium">Commande en ligne indisponible dans cette cave</p>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          {storeName} n’a pas encore activé le retrait ni la livraison en ligne. Vous pouvez
          réserver sur place, ou choisir une cave qui propose le retrait.
        </p>
        <button
          onClick={() => router.push('/choisir-ma-cave')}
          className="mt-5 bg-ink text-cream px-5 py-3 text-sm"
        >
          Choisir une autre cave
        </button>
      </div>
    );
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...Object.fromEntries(fd), method }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && json.orderId) {
      router.push(`/commande/${json.orderId}`);
      return;
    }
    setError(
      json.error === 'bad_address' ? 'Adresse de livraison incomplète.'
      : json.error === 'bad_email' ? 'Adresse e-mail invalide.'
      : json.error === 'empty_cart' ? 'Votre panier est vide.'
      : 'La commande n’a pas pu être enregistrée. Réessayez.',
    );
  }

  const selected = options.find((o) => o.key === method);
  const shippingCost = selected
    ? selected.freeAbove && subtotal >= selected.freeAbove ? 0 : selected.price
    : 0;

  return (
    <form onSubmit={submit} className="space-y-8">
      <fieldset>
        <legend className="eyebrow mb-3">Mode de retrait</legend>
        <div className="space-y-2.5">
          {options.map((o) => {
            const free = o.freeAbove && subtotal >= o.freeAbove;
            return (
              <label
                key={o.key}
                className={`flex items-start gap-3 border p-4 cursor-pointer ${method === o.key ? 'border-bordeaux bg-bordeaux-tint' : 'border-line bg-surface'}`}
              >
                <input
                  type="radio" name="fulfilment" value={o.key} checked={method === o.key}
                  onChange={() => setMethod(o.key)} className="mt-1"
                />
                <span className="flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <strong className="font-medium">{o.label}</strong>
                    <span className="text-sm">{free ? 'Offerte' : o.price === 0 ? 'Gratuit' : money(o.price)}</span>
                  </span>
                  <span className="block text-sm text-muted mt-0.5">{o.detail}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-3">Vos coordonnées</legend>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field name="firstName" label="Prénom" required />
          <Field name="lastName" label="Nom" required />
          <div className="sm:col-span-2"><Field name="email" label="E-mail" type="email" required /></div>
        </div>
      </fieldset>

      {method === 'livraison-standard' ? (
        <fieldset>
          <legend className="eyebrow mb-3">Adresse de livraison</legend>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Field name="streetName" label="Adresse" required /></div>
            <Field name="postalCode" label="Code postal" required />
            <Field name="city" label="Ville" required />
          </div>
        </fieldset>
      ) : (
        <div className="border border-line bg-surface p-4 text-sm">
          <p className="font-medium">À retirer chez</p>
          <p className="mt-1 text-ink-soft">{storeName}<br />{storeAddress}</p>
        </div>
      )}

      <div className="rule pt-5 flex items-baseline justify-between">
        <span className="font-display text-lg">Total TTC</span>
        <span className="font-display text-2xl">{money(subtotal + shippingCost)}</span>
      </div>

      {error ? <p className="text-sm text-bordeaux" role="alert">{error}</p> : null}

      <button
        type="submit" disabled={busy}
        className="w-full bg-bordeaux hover:bg-bordeaux-dark disabled:opacity-60 text-white py-4 text-sm font-medium"
      >
        {busy ? 'Enregistrement…' : 'Confirmer ma commande'}
      </button>
      <p className="text-xs text-muted text-center">
        Démonstration : aucun paiement réel n’est effectué. La vente d’alcool est interdite aux mineurs.
      </p>
    </form>
  );
}

function Field({ name, label, type = 'text', required }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="block text-xs text-muted mb-1">{label}{required ? ' *' : ''}</span>
      <input
        name={name} type={type} required={required}
        className="w-full border border-line bg-surface px-3 py-2.5 text-sm"
      />
    </label>
  );
}
