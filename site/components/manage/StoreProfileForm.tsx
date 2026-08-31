'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export interface ProfileValues {
  street_address?: string; city?: string; postal_code?: string;
  phone?: string; opening_hours?: string;
  click_collect_enabled: boolean; delivery_enabled: boolean;
  delivery_radius_km?: number; timeslot_capacity?: number;
}

/**
 * The cave's own profile. Fulfilment toggles the tier does not include are rendered DISABLED with
 * the reason, rather than offered and then rejected — and the API refuses them regardless.
 */
export function StoreProfileForm({
  values, caps, tierLabel,
}: { values: ProfileValues; caps: { clickCollect: boolean; delivery: boolean }; tierLabel: string }) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'saved' | 'error'>('idle');
  const [busy, setBusy] = useState(false);
  const [, start] = useTransition();

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setState('idle');
    const fd = new FormData(e.currentTarget);
    const res = await fetch('/api/manage/magasin', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        street_address: fd.get('street_address'), city: fd.get('city'), postal_code: fd.get('postal_code'),
        phone: fd.get('phone'), opening_hours: fd.get('opening_hours'),
        click_collect_enabled: fd.get('click_collect_enabled') === 'on',
        delivery_enabled: fd.get('delivery_enabled') === 'on',
        delivery_radius_km: fd.get('delivery_radius_km'),
        timeslot_capacity: fd.get('timeslot_capacity'),
      }),
    });
    setBusy(false);
    setState(res.ok ? 'saved' : 'error');
    if (res.ok) start(() => router.refresh());
  }

  return (
    <form onSubmit={save} className="grid gap-6 lg:grid-cols-2 items-start">
      <fieldset className="bg-surface border border-line p-5 space-y-3">
        <legend className="eyebrow px-1">Coordonnées</legend>
        <Field name="street_address" label="Adresse" defaultValue={values.street_address} />
        <div className="grid grid-cols-2 gap-3">
          <Field name="postal_code" label="Code postal" defaultValue={values.postal_code} />
          <Field name="city" label="Ville" defaultValue={values.city} />
        </div>
        <Field name="phone" label="Téléphone" defaultValue={values.phone} />
        <Field name="opening_hours" label="Horaires" defaultValue={values.opening_hours} />
      </fieldset>

      <fieldset className="bg-surface border border-line p-5 space-y-4">
        <legend className="eyebrow px-1">Retrait &amp; livraison</legend>

        <Toggle
          name="click_collect_enabled" label="Retrait en magasin"
          defaultChecked={values.click_collect_enabled} disabled={!caps.clickCollect}
          note={caps.clickCollect ? 'Vos clients réservent en ligne et retirent en cave.' : `Non inclus au palier ${tierLabel}.`}
        />
        <Toggle
          name="delivery_enabled" label="Livraison à domicile"
          defaultChecked={values.delivery_enabled} disabled={!caps.delivery}
          note={caps.delivery ? 'Livraison dans le rayon défini ci-dessous.' : `Non inclus au palier ${tierLabel}.`}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field name="delivery_radius_km" label="Rayon (km)" type="number" defaultValue={values.delivery_radius_km?.toString()} disabled={!caps.delivery} />
          <Field name="timeslot_capacity" label="Créneaux / jour" type="number" defaultValue={values.timeslot_capacity?.toString()} disabled={!caps.clickCollect} />
        </div>
      </fieldset>

      <div className="lg:col-span-2 flex items-center gap-4">
        <button type="submit" disabled={busy}
          className="bg-bordeaux hover:bg-bordeaux-dark disabled:opacity-60 text-white px-6 py-3 text-sm font-medium">
          {busy ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {state === 'saved' ? <p className="text-sm text-sage" role="status">Modifications enregistrées.</p> : null}
        {state === 'error' ? <p className="text-sm text-bordeaux" role="alert">Enregistrement impossible.</p> : null}
      </div>
    </form>
  );
}

function Field({ name, label, defaultValue, type = 'text', disabled }: {
  name: string; label: string; defaultValue?: string; type?: string; disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-muted mb-1">{label}</span>
      <input
        name={name} type={type} defaultValue={defaultValue ?? ''} disabled={disabled}
        className="w-full border border-line bg-surface px-3 py-2.5 text-sm disabled:bg-cream-deep disabled:text-muted"
      />
    </label>
  );
}

function Toggle({ name, label, defaultChecked, disabled, note }: {
  name: string; label: string; defaultChecked: boolean; disabled?: boolean; note: string;
}) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? 'opacity-60' : ''}`}>
      <input
        type="checkbox" name={name} defaultChecked={defaultChecked} disabled={disabled}
        className="mt-1 disabled:cursor-not-allowed"
      />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted mt-0.5">{note}</span>
      </span>
    </label>
  );
}
