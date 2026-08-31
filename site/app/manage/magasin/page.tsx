import type { Metadata } from 'next';
import { requireManageContext } from '@/lib/manage/session';
import { allOwners } from '@/lib/ct/stores';
import { StoreProfileForm } from '@/components/manage/StoreProfileForm';
import { Panel } from '@/components/manage/ui';
import { money } from '@/lib/format';
import { FRANCHISOR } from '@/lib/constants';

export const metadata: Metadata = { title: 'Ma cave' };

export default async function ManageStore() {
  const ctx = await requireManageContext();
  const owners = await allOwners();
  const owner = owners.find((o) => o.key === ctx.store.programme.ownerKey);
  const p = ctx.store.programme;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl">Ma cave</h1>
        <p className="text-sm text-muted mt-1">{ctx.store.name}</p>
      </div>

      <StoreProfileForm
        values={{
          street_address: p.street, city: p.city, postal_code: p.postalCode,
          phone: p.phone, opening_hours: p.hours,
          click_collect_enabled: p.clickCollect, delivery_enabled: p.delivery,
          delivery_radius_km: p.deliveryRadiusKm, timeslot_capacity: p.timeslotCapacity,
        }}
        caps={{ clickCollect: ctx.tier.features.clickCollect, delivery: ctx.tier.features.homeDelivery }}
        tierLabel={ctx.tier.labelFr || ctx.tier.label}
      />

      <Panel title="Votre adhésion" subtitle={`Géré par ${FRANCHISOR} — non modifiable ici`}>
        <dl className="divide-y divide-line">
          {[
            ['Palier', `${ctx.tier.labelFr || ctx.tier.label}${ctx.tier.monthlyFeeEur ? ` · ${money(ctx.tier.monthlyFeeEur * 100)} / mois` : ' · gratuit'}`],
            ['Statut', p.lifecycleState === 'ACTIVE' ? 'Active' : (p.lifecycleState ?? '—')],
            ['Exploitant', owner?.displayName ?? p.ownerKey ?? '—'],
            ['Adhérent depuis', p.optInDate ?? '—'],
            ['Ouverture en ligne', p.activationDate ?? '—'],
            ['Plafond de gamme', ctx.tier.rangeCeiling === null ? 'Illimité' : `${ctx.tier.rangeCeiling} références`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-6 px-5 py-3 text-sm">
              <dt className="text-muted">{k}</dt>
              <dd className="text-right">{v}</dd>
            </div>
          ))}
        </dl>
      </Panel>
    </div>
  );
}
