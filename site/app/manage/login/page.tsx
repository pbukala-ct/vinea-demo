import type { Metadata } from 'next';
import { allStores } from '@/lib/ct/stores';
import { allTiers } from '@/lib/features';
import { signIn } from './actions';
import { FRANCHISOR } from '@/lib/constants';

export const metadata: Metadata = { title: 'Back-office caviste' };

export default async function ManageLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const [stores, tiers] = await Promise.all([allStores(), allTiers()]);
  const trading = stores.filter((s) => s.programme.lifecycleState === 'ACTIVE');
  const tierOf = (k?: string) => tiers.find((t) => t.key === k);

  return (
    <div className="mx-auto max-w-[760px] px-5 py-16">
      <p className="eyebrow">{FRANCHISOR} · Back-office</p>
      <h1 className="text-4xl mt-2">Espace caviste</h1>
      <p className="mt-3 text-muted leading-relaxed">
        Chaque caviste du réseau dispose de son propre back-office : ses commandes, ses ventes, sa
        gamme et ses promotions — dans le même projet commercetools, limité à sa seule cave.
      </p>
      <p className="mt-2 text-xs text-muted">
        Démonstration : choisir une cave vaut authentification. Aucun mot de passe.
      </p>

      {error ? (
        <p className="mt-5 text-sm text-bordeaux bg-bordeaux-tint border border-bordeaux/20 px-4 py-3" role="alert">
          Cette cave n’est pas encore active — pas de back-office à ouvrir.
        </p>
      ) : null}

      <ul className="mt-8 divide-y divide-line border-y border-line">
        {trading.map((s) => {
          const tier = tierOf(s.programme.programmeTier);
          return (
            <li key={s.key} className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="font-medium">{s.programme.city}</p>
                <p className="text-xs text-muted truncate">
                  {s.name} · {s.programme.postalCode}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[10px] uppercase tracking-wider text-gold border border-gold/50 px-1.5 py-0.5">
                  {tier?.labelFr ?? s.programme.programmeTier}
                </span>
                <form action={signIn}>
                  <input type="hidden" name="storeKey" value={s.key} />
                  <button className="bg-ink text-cream px-4 py-2.5 text-sm hover:bg-ink-soft">
                    Ouvrir
                  </button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
