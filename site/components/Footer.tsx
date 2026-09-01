import Link from 'next/link';
import { BRAND, FRANCHISOR } from '@/lib/constants';
import { tradingStores } from '@/lib/ct/stores';

export async function Footer() {
  const stores = await tradingStores();
  return (
    <footer className="mt-20 bg-ink text-cream/70 text-sm">
      <div className="mx-auto max-w-[1240px] px-5 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-xl text-cream">{BRAND}</p>
          <p className="mt-2 text-cream/50 text-xs leading-relaxed">
            Un réseau de {stores.length} cavistes indépendants, réunis par {FRANCHISOR}.
            Chaque cave choisit sa gamme et ses prix.
          </p>
        </div>
        <div>
          <p className="eyebrow text-cream/50 mb-3">La cave</p>
          <ul className="space-y-1.5">
            <li><Link href="/catalogue" className="hover:text-cream">Tous nos vins</Link></li>
            <li><Link href="/c/champagne-effervescents" className="hover:text-cream">Champagne</Link></li>
            <li><Link href="/c/spiritueux" className="hover:text-cream">Spiritueux</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow text-cream/50 mb-3">Le réseau</p>
          <ul className="space-y-1.5">
            <li><Link href="/nos-cavistes" className="hover:text-cream">Nos cavistes</Link></li>
            <li><Link href="/choisir-ma-cave" className="hover:text-cream">Changer de cave</Link></li>
            <li><Link href="/devenir-caviste" className="hover:text-cream">Devenir caviste Bellevin</Link></li>
            {/* The retailer's way in. Discreet on purpose — shoppers never need it — but present,
                so the back office is reachable without typing a URL mid-demo. */}
            <li><Link href="/manage/login" className="hover:text-cream">Espace caviste</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow text-cream/50 mb-3">Vente d’alcool</p>
          <p className="text-xs leading-relaxed text-cream/50">
            La vente d’alcool est interdite aux mineurs de moins de 18 ans.
            L’abus d’alcool est dangereux pour la santé, à consommer avec modération.
          </p>
        </div>
      </div>
      <div className="rule border-cream/10">
        <div className="mx-auto max-w-[1240px] px-5 py-5 text-xs text-cream/40">
          Démonstration commercetools — {BRAND} et {FRANCHISOR} sont fictifs. Prix TTC, TVA 20 %.
        </div>
      </div>
    </footer>
  );
}
