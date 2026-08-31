import Link from 'next/link';
import { getManageContext } from '@/lib/manage/session';
import { ManageNav, type NavItem } from '@/components/manage/ManageNav';
import { signOut } from './login/actions';
import { BRAND } from '@/lib/constants';

/**
 * Back-office shell. Nav items are derived from the cave's TIER: what a retailer can do here is
 * exactly what they have opted into, and locked surfaces stay visible with a padlock rather than
 * disappearing — a retailer should be able to see what upgrading would give them.
 */
export default async function ManageLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getManageContext();

  // the login page renders inside this layout too, before there is a session
  if (!ctx) {
    return (
      <main className="flex-1 bg-cream-deep">
        <div className="bg-ink text-cream">
          <div className="mx-auto max-w-[1240px] px-5 py-4 flex items-center justify-between">
            <span className="font-display text-xl text-cream">{BRAND}</span>
            <Link href="/" className="text-sm text-cream/70 hover:text-cream">Voir la boutique</Link>
          </div>
        </div>
        {children}
      </main>
    );
  }

  const f = ctx.tier.features;
  const items: NavItem[] = [
    { href: '/manage', label: 'Tableau de bord', locked: !f.salesDashboard },
    { href: '/manage/commandes', label: 'Commandes', locked: false },
    { href: '/manage/gamme', label: 'Ma gamme', locked: !f.assortmentControl },
    { href: '/manage/promotions', label: 'Promotions', locked: !f.storePromotions },
    { href: '/manage/magasin', label: 'Ma cave', locked: false },
  ];

  return (
    <main className="flex-1 bg-cream-deep">
      <div className="bg-ink text-cream">
        <div className="mx-auto max-w-[1240px] px-5 py-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div>
            <p className="eyebrow text-gold">Back-office caviste</p>
            <p className="font-display text-xl leading-tight">{ctx.store.name}</p>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-gold border border-gold/40 px-1.5 py-0.5">
            {ctx.tier.labelFr || ctx.tier.label}
          </span>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <Link href="/" className="text-cream/70 hover:text-cream">Voir la boutique</Link>
            <form action={signOut}>
              <button className="text-cream/70 hover:text-cream underline underline-offset-2">Quitter</button>
            </form>
          </div>
        </div>
      </div>
      <ManageNav items={items} />
      <div className="mx-auto max-w-[1240px] px-5 py-8">{children}</div>
    </main>
  );
}
