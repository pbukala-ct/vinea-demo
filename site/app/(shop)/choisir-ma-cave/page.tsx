import type { Metadata } from 'next';
import { allStores, allOwners } from '@/lib/ct/stores';
import { allTiers } from '@/lib/features';
import { getSelectedStoreKey } from '@/lib/store-selection';
import { chooseStore } from './actions';
import { FRANCHISOR } from '@/lib/constants';

export const metadata: Metadata = { title: 'Choisir ma cave' };

export default async function ChoisirMaCave({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const [stores, owners, tiers, selected] = await Promise.all([
    allStores(), allOwners(), allTiers(), getSelectedStoreKey(),
  ]);
  const ownerName = (key?: string) => owners.find((o) => o.key === key)?.displayName ?? '—';
  const tierOf = (key?: string) => tiers.find((t) => t.key === key);

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-12">
      <p className="eyebrow">Le réseau {FRANCHISOR}</p>
      <h1 className="text-4xl mt-2">Choisissez votre cave</h1>
      <p className="mt-3 text-muted max-w-2xl">
        Chaque Cave Bellevin est tenue par un caviste indépendant. La cave que vous choisissez
        décide de la gamme proposée, des prix et des modes de retrait — c’est pourquoi nous vous le
        demandons avant tout.
      </p>

      {error ? (
        <p className="mt-5 text-sm text-bordeaux bg-bordeaux-tint border border-bordeaux/20 px-4 py-3" role="alert">
          Cette cave n’est pas encore ouverte à la vente en ligne.
        </p>
      ) : null}

      <ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stores.map((s) => {
          const p = s.programme;
          const open = p.lifecycleState === 'ACTIVE';
          const tier = tierOf(p.programmeTier);
          const isCurrent = s.key === selected;
          return (
            <li
              key={s.key}
              className={`flex flex-col bg-surface border p-5 ${isCurrent ? 'border-bordeaux ring-1 ring-bordeaux' : 'border-line'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl leading-tight">{p.city}</h2>
                  <p className="text-sm text-muted mt-0.5">{s.name.replace('Cave Bellevin ', '')}</p>
                </div>
                {open ? (
                  <span className="text-[10px] uppercase tracking-wider text-gold border border-gold/50 px-1.5 py-0.5 whitespace-nowrap">
                    {tier?.labelFr ?? p.programmeTier}
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-wider text-muted border border-line px-1.5 py-0.5 whitespace-nowrap">
                    Bientôt
                  </span>
                )}
              </div>

              <dl className="mt-4 space-y-1.5 text-sm text-ink-soft">
                <div>{p.street}, {p.postalCode} {p.city}</div>
                {p.hours ? <div className="text-muted text-xs">{p.hours}</div> : null}
                <div className="text-muted text-xs">{p.phone}</div>
              </dl>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {p.clickCollect ? <Chip>Retrait en magasin</Chip> : null}
                {p.delivery ? <Chip>Livraison {p.deliveryRadiusKm} km</Chip> : null}
                {!p.clickCollect && !p.delivery && open ? <Chip muted>Vente en cave uniquement</Chip> : null}
              </div>

              <p className="mt-4 text-xs text-muted">Tenue par {ownerName(p.ownerKey)}</p>

              <form action={chooseStore} className="mt-5">
                <input type="hidden" name="storeKey" value={s.key} />
                <button
                  type="submit"
                  disabled={!open}
                  className={`w-full py-3 text-sm font-medium transition-colors ${
                    !open ? 'bg-cream-deep text-muted cursor-not-allowed'
                      : isCurrent ? 'bg-ink text-cream'
                      : 'bg-bordeaux hover:bg-bordeaux-dark text-white'
                  }`}
                >
                  {!open ? 'Ouverture prochaine' : isCurrent ? 'Ma cave actuelle' : 'Choisir cette cave'}
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const Chip = ({ children, muted }: { children: React.ReactNode; muted?: boolean }) => (
  <span className={`text-[11px] px-2 py-0.5 border ${muted ? 'text-muted border-line' : 'text-sage border-sage/30 bg-sage/5'}`}>
    {children}
  </span>
);
