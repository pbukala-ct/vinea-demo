import type { Metadata } from 'next';
import { allTiers, type TierFeatures } from '@/lib/features';
import { allStores } from '@/lib/ct/stores';
import { money } from '@/lib/format';
import { FRANCHISOR, BRAND } from '@/lib/constants';

export const metadata: Metadata = { title: 'Devenir caviste' };

const FEATURE_LABELS: [keyof TierFeatures, string][] = [
  ['productSearch', 'Recherche et filtres sur la vitrine'],
  ['clickCollect', 'Retrait en magasin (click & collect)'],
  ['homeDelivery', 'Livraison à domicile'],
  ['personalisation', 'Vitrine personnalisée'],
  ['assortmentControl', 'Gestion de sa propre gamme'],
  ['storePromotions', 'Promotions propres au magasin'],
  ['salesDashboard', 'Tableau de bord des ventes'],
];

/**
 * The opt-in proposition, rendered straight from the `programme-tiers` custom objects.
 *
 * Nothing on this page is hardcoded: change a tier in the Merchant Center and this table changes.
 * That is the demo's point — capability is governed data, not a code branch.
 */
export default async function DevenirCaviste() {
  const [tiers, stores] = await Promise.all([allTiers(), allStores()]);
  const countAt = (key: string) => stores.filter((s) => s.programme.programmeTier === key).length;

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-12">
      <p className="eyebrow">{FRANCHISOR}</p>
      <h1 className="text-4xl mt-2">Devenir caviste {BRAND}</h1>
      <p className="mt-3 text-muted max-w-2xl leading-relaxed">
        L’adhésion est volontaire et graduée. Vous choisissez le palier qui correspond à votre cave,
        et vous en changez quand vous voulez — sans migration, sans nouveau site.
      </p>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {tiers.map((t, i) => (
          <div key={t.key} className={`flex flex-col border p-7 ${i === 1 ? 'border-bordeaux bg-surface' : 'border-line bg-surface'}`}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl">{t.labelFr || t.label}</h2>
              <span className="text-xs text-muted">{countAt(t.key)} cave{countAt(t.key) > 1 ? 's' : ''}</span>
            </div>
            <p className="mt-2 font-display text-3xl">
              {t.monthlyFeeEur === 0 ? 'Gratuit' : money(t.monthlyFeeEur * 100)}
              {t.monthlyFeeEur > 0 ? <span className="text-sm text-muted font-sans"> / mois</span> : null}
            </p>
            <p className="mt-3 text-sm text-muted leading-relaxed min-h-[3.5rem]">{t.description}</p>

            <p className="mt-5 eyebrow">Gamme gérée par le caviste</p>
            <p className="text-sm mt-1">
              {t.rangeCeiling === null ? 'Illimitée' : t.rangeCeiling === 0 ? 'Gamme définie par le siège' : `${t.rangeCeiling} références`}
            </p>

            <ul className="mt-5 space-y-2 text-sm">
              {FEATURE_LABELS.map(([k, label]) => {
                const on = t.features[k];
                return (
                  <li key={k} className={`flex items-start gap-2.5 ${on ? '' : 'text-muted'}`}>
                    <span className={`mt-0.5 shrink-0 ${on ? 'text-sage' : 'text-line'}`} aria-hidden>
                      {on ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 6l12 12M18 6L6 18" /></svg>
                      )}
                    </span>
                    <span>{label}</span>
                    <span className="sr-only">{on ? 'inclus' : 'non inclus'}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs text-muted">
        Ces paliers sont lus en direct depuis le référentiel {FRANCHISOR}. Un changement de palier
        prend effet immédiatement sur la vitrine du caviste.
      </p>
    </div>
  );
}
