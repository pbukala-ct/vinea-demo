import type { Metadata } from 'next';
import Link from 'next/link';
import { allStores, allOwners } from '@/lib/ct/stores';
import { allTiers } from '@/lib/features';
import { FRANCHISOR } from '@/lib/constants';

export const metadata: Metadata = { title: 'Nos cavistes' };

/**
 * The network, grouped by franchisee owner. This page IS the opt-in model made visible: one brand,
 * independent operators, several of whom run more than one cave, each at their own tier.
 */
export default async function NosCavistes() {
  const [stores, owners, tiers] = await Promise.all([allStores(), allOwners(), allTiers()]);
  const tierOf = (k?: string) => tiers.find((t) => t.key === k);
  const trading = stores.filter((s) => s.programme.lifecycleState === 'ACTIVE');

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-12">
      <p className="eyebrow">{FRANCHISOR}</p>
      <h1 className="text-4xl mt-2">Nos cavistes</h1>
      <p className="mt-3 text-muted max-w-2xl leading-relaxed">
        {trading.length} caves ouvertes, tenues par {owners.length} exploitants indépendants.
        Un même catalogue, une même enseigne — mais chaque caviste choisit son palier d’adhésion,
        sa gamme et ses prix.
      </p>

      <div className="mt-10 space-y-10">
        {owners.map((o) => {
          const mine = stores.filter((s) => s.programme.ownerKey === o.key);
          if (!mine.length) return null;
          return (
            <section key={o.key}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pb-3 rule border-t-0 border-b">
                <h2 className="font-display text-2xl">{o.displayName}</h2>
                <span className="text-sm text-muted">
                  {mine.length} cave{mine.length > 1 ? 's' : ''}
                  {o.siret ? ` · SIRET ${o.siret}` : ''}
                </span>
              </div>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {mine.map((s) => {
                  const p = s.programme;
                  const open = p.lifecycleState === 'ACTIVE';
                  const tier = tierOf(p.programmeTier);
                  return (
                    <li key={s.key} className="bg-surface border border-line p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg leading-tight">{p.city}</h3>
                        <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 whitespace-nowrap border ${open ? 'text-gold border-gold/50' : 'text-muted border-line'}`}>
                          {open ? tier?.labelFr ?? p.programmeTier : 'Bientôt'}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-muted">{p.street}, {p.postalCode} {p.city}</p>
                      {open ? (
                        <>
                          <p className="mt-3 text-xs text-ink-soft">
                            {[p.clickCollect ? 'Retrait' : null, p.delivery ? 'Livraison' : null].filter(Boolean).join(' · ') || 'Vente en cave'}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">Adhérent depuis {p.optInDate?.slice(0, 7)}</p>
                        </>
                      ) : (
                        <p className="mt-3 text-xs text-muted">Adhésion en cours de validation.</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="mt-14 bg-ink text-cream p-8 md:p-12">
        <p className="eyebrow text-gold">Vous êtes caviste ?</p>
        <p className="mt-3 font-display text-3xl max-w-xl leading-snug">
          Rejoignez le réseau au palier qui vous convient, changez quand vous voulez.
        </p>
        <Link href="/devenir-caviste" className="mt-6 inline-block bg-gold text-ink px-6 py-3.5 text-sm font-medium">
          Voir les paliers d’adhésion
        </Link>
      </div>
    </div>
  );
}
