import Link from 'next/link';
import { getStoreContextOrNull } from '@/lib/session';
import { categoryTree } from '@/lib/ct/categories';
import { searchProducts, promotedProducts } from '@/lib/ct/search';
import { tradingStores, allStores } from '@/lib/ct/stores';
import { ProductCard } from '@/components/ProductCard';
import { BRAND, FRANCHISOR } from '@/lib/constants';

export default async function Home() {
  const ctx = await getStoreContextOrNull();
  const [stores, all] = await Promise.all([tradingStores(), allStores()]);

  if (!ctx) return <NoStore trading={stores.length} total={all.length} />;

  const [tree, listing, onPromo] = await Promise.all([
    categoryTree(),
    searchProducts({ sort: 'name-asc', page: 1 }),
    promotedProducts(4),
  ]);
  // real promotions if this caviste is running any, otherwise an honest "selection"
  const featured = onPromo.length >= 4 ? onPromo : listing.products.slice(0, 4);
  const p = ctx.store.programme;

  return (
    <>
      {/* hero */}
      <section className="bg-ink text-cream">
        <div className="mx-auto max-w-[1240px] px-5 py-16 md:py-24 grid md:grid-cols-[minmax(0,1.15fr)_minmax(260px,1fr)] gap-12 items-center">
          <div>
            <p className="eyebrow text-gold">Votre cave · {p.city}</p>
            <h1 className="mt-3 text-5xl md:text-6xl leading-[1.05]">
              Le goût du quartier,<br />la cave d’un indépendant.
            </h1>
            <p className="mt-5 text-cream/70 max-w-lg leading-relaxed">
              {ctx.store.name} sélectionne sa propre gamme parmi le catalogue {FRANCHISOR}.
              Ce que vous voyez ici, c’est ce qui est réellement en cave, au prix de cette cave.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/catalogue" className="bg-gold text-ink px-6 py-3.5 text-sm font-medium hover:bg-gold/90">
                Explorer la cave
              </Link>
              <Link href="/choisir-ma-cave" className="border border-cream/30 px-6 py-3.5 text-sm hover:border-cream">
                Changer de cave
              </Link>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 text-sm border-l border-cream/15 pl-8">
            <Stat label="Références en cave" value={String(listing.total)} />
            <Stat label="Cavistes du réseau" value={String(stores.length)} />
            <Stat label="Retrait" value={p.clickCollect ? 'En 2 heures' : 'En cave'} />
            <Stat label="Livraison" value={p.delivery ? `${p.deliveryRadiusKm} km` : 'Non proposée'} />
          </dl>
        </div>
      </section>

      {/* categories */}
      <section className="mx-auto max-w-[1240px] px-5 py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">La cave</p>
            <h2 className="text-3xl mt-1">Par famille</h2>
          </div>
          <Link href="/catalogue" className="text-sm underline underline-offset-4 hover:text-bordeaux">
            Tout voir
          </Link>
        </div>
        <ul className="mt-7 grid grid-cols-2 md:grid-cols-4 gap-4">
          {tree.slice(0, 8).map((c) => (
            <li key={c.id}>
              <Link
                href={`/c/${c.key}`}
                className="flex flex-col justify-between h-32 bg-surface border border-line hover:border-bordeaux p-5 transition-colors group"
              >
                <span className="font-display text-xl group-hover:text-bordeaux">{c.label}</span>
                <span className="text-xs text-muted tabular-nums">{c.count} références</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* featured */}
      {featured.length ? (
        <section className="bg-cream-deep py-14">
          <div className="mx-auto max-w-[1240px] px-5">
            <p className="eyebrow">{onPromo.length >= 4 ? `Offres du moment à ${p.city}` : `Sélection de ${p.city}`}</p>
            <h2 className="text-3xl mt-1">Les coups de cœur du caviste</h2>
            <ul className="mt-7 grid grid-cols-2 md:grid-cols-4 gap-4">
              {featured.map((prod) => <li key={prod.id}><ProductCard product={prod} /></li>)}
            </ul>
          </div>
        </section>
      ) : null}

      {/* the store itself */}
      <section className="mx-auto max-w-[1240px] px-5 py-14 grid md:grid-cols-2 gap-10">
        <div>
          <p className="eyebrow">Votre caviste</p>
          <h2 className="text-3xl mt-1">{ctx.store.name}</h2>
          <address className="mt-4 not-italic text-ink-soft leading-relaxed">
            {p.street}<br />{p.postalCode} {p.city}<br />
            <span className="text-muted">{p.phone}</span>
          </address>
          {p.hours ? <p className="mt-4 text-sm text-muted">{p.hours}</p> : null}
          <div className="mt-6 flex flex-wrap gap-2">
            {p.clickCollect ? <Cap>Retrait en magasin en 2 h</Cap> : null}
            {p.delivery ? <Cap>Livraison sous {p.deliveryRadiusKm} km</Cap> : null}
            {p.timeslotCapacity ? <Cap>{p.timeslotCapacity} créneaux / jour</Cap> : null}
          </div>
        </div>
        <div className="bg-surface border border-line p-7">
          <p className="eyebrow">Le réseau</p>
          <p className="mt-3 font-display text-2xl leading-snug">
            {stores.length} cavistes indépendants, un seul catalogue.
          </p>
          <p className="mt-3 text-sm text-muted leading-relaxed">
            Chaque caviste adhère au programme {FRANCHISOR} au palier qui lui convient, et garde la
            main sur sa gamme et ses prix. C’est le même site pour tous — jamais le même magasin.
          </p>
          <Link href="/nos-cavistes" className="mt-6 inline-block text-sm underline underline-offset-4 hover:text-bordeaux">
            Voir les {stores.length} caves
          </Link>
        </div>
      </section>
    </>
  );
}

/** Landing state before a store is picked: explain the model, then get out of the way. */
function NoStore({ trading, total }: { trading: number; total: number }) {
  return (
    // fills the viewport: as a flex-1 child a short hero left a dead cream band above the footer
    <section className="bg-ink text-cream min-h-[calc(100vh-13rem)] flex items-center">
      <div className="mx-auto max-w-[1240px] px-5 py-24 text-center w-full">
        <p className="eyebrow text-gold">{FRANCHISOR}</p>
        <h1 className="mt-4 text-5xl md:text-7xl leading-[1.02]">{BRAND}</h1>
        <p className="mt-6 text-cream/70 max-w-xl mx-auto leading-relaxed">
          {trading} cavistes indépendants, chacun avec sa gamme, ses prix et ses horaires.
          Dites-nous laquelle est la vôtre et nous vous montrons ce qui est réellement en cave.
        </p>
        <Link
          href="/choisir-ma-cave"
          className="mt-9 inline-block bg-gold text-ink px-8 py-4 text-sm font-medium hover:bg-gold/90"
        >
          Choisir ma cave
        </Link>
        <p className="mt-5 text-xs text-cream/40">
          {total - trading > 0 ? `${total - trading} nouvelle cave rejoint le réseau prochainement.` : null}
        </p>
      </div>
    </section>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-cream/50 text-xs uppercase tracking-wider">{label}</dt>
    <dd className="font-display text-2xl mt-1">{value}</dd>
  </div>
);
const Cap = ({ children }: { children: React.ReactNode }) => (
  <span className="text-xs border border-sage/30 bg-sage/5 text-sage px-2.5 py-1">{children}</span>
);
