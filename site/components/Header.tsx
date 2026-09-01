import Link from 'next/link';
import { getStoreContextOrNull } from '@/lib/session';
import { getShopperSession } from '@/lib/auth/session';
import { categoryTree } from '@/lib/ct/categories';
import { getCart, mapCart } from '@/lib/ct/cart';
import { BRAND, BRAND_TAGLINE } from '@/lib/constants';
import { StoreBar } from './StoreBar';
import { CategoryNav } from './CategoryNav';
import { SearchBox } from './SearchBox';

export async function Header() {
  const ctx = await getStoreContextOrNull();
  const [tree, cart, session] = await Promise.all([
    categoryTree(),
    ctx ? getCart(ctx).then((c) => (c ? mapCart(c) : null)) : Promise.resolve(null),
    getShopperSession(),
  ]);
  // Search is a tier capability: an ESSENTIEL caviste has not opted into it, so the box is absent
  // rather than present-and-inert.
  const canSearch = !!ctx?.tier.features.productSearch;

  return (
    <header>
      <StoreBar ctx={ctx} />
      <div className="bg-cream border-b border-line">
        <div className="mx-auto max-w-[1240px] px-5 py-5 flex items-center gap-8">
          <Link href="/" className="shrink-0">
            <span className="block font-display text-2xl leading-none text-bordeaux">{BRAND}</span>
            <span className="block text-[10px] tracking-[0.18em] uppercase text-muted mt-1">{BRAND_TAGLINE}</span>
          </Link>
          {canSearch ? <div className="hidden md:block flex-1 max-w-xl"><SearchBox /></div> : <div className="flex-1" />}
          <nav className="flex items-center gap-5 text-sm shrink-0">
            <Link href="/catalogue" className="hover:text-bordeaux hidden sm:inline">La cave</Link>
            <Link href="/nos-cavistes" className="hover:text-bordeaux hidden sm:inline">Nos cavistes</Link>
            {/* Signed-in shoppers get their first name; anonymous ones a plain sign-in link. */}
            <Link
              href={session ? '/mon-compte' : '/connexion'}
              className="flex items-center gap-1.5 hover:text-bordeaux"
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <circle cx="10" cy="7" r="3" /><path d="M4 17c0-3 2.7-5 6-5s6 2 6 5" />
              </svg>
              <span className="hidden sm:inline">{session ? session.firstName || 'Mon compte' : 'Connexion'}</span>
            </Link>
            <Link href="/panier" className="flex items-center gap-2 hover:text-bordeaux" aria-label="Panier">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path d="M4 6h12l-1 10H5L4 6z" /><path d="M7.5 6V4.5a2.5 2.5 0 015 0V6" />
              </svg>
              <span className="tabular-nums">{cart?.itemCount ?? 0}</span>
            </Link>
          </nav>
        </div>
        {canSearch ? <div className="md:hidden px-5 pb-4"><SearchBox compact /></div> : null}
      </div>
      <CategoryNav tree={tree} />
    </header>
  );
}
