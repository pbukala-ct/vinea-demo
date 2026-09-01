import Link from 'next/link';
import type { StoreContext } from '@/lib/session';
import { firstClause } from '@/lib/format';

/**
 * The store strip. Always visible, because in this model the store the shopper is buying from is
 * the single most consequential piece of context on the page — it decides range, price and
 * fulfilment. Also surfaces the tier's fulfilment capabilities, so opting in has visible effects.
 *
 * It also carries a small "Espace caviste" link into the retailer back office. That is a DEMO
 * affordance, not something a real shopper needs: it keeps the presenter one click from /manage
 * instead of typing a URL on stage. The same link lives in the footer, which is where it would
 * belong on its own in production.
 */
export function StoreBar({ ctx }: { ctx: StoreContext | null }) {
  if (!ctx) {
    return (
      <div className="bg-bordeaux text-white text-sm">
        <div className="mx-auto max-w-[1240px] px-5 py-2.5 flex items-center justify-between gap-4">
          <span className="truncate">Choisissez votre cave pour voir la gamme, les prix et les stocks.</span>
          <span className="flex items-center gap-4 shrink-0">
            <Link href="/choisir-ma-cave" className="underline underline-offset-2 font-medium whitespace-nowrap">
              Choisir ma cave
            </Link>
            <ManageLink className="text-white/70 hover:text-white" />
          </span>
        </div>
      </div>
    );
  }
  const { store, tier } = ctx;
  const p = store.programme;
  return (
    <div className="bg-ink text-cream text-sm">
      <div className="mx-auto max-w-[1240px] px-5 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <span className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="M10 18s6-5.3 6-9.6A6 6 0 004 8.4C4 12.7 10 18 10 18z" /><circle cx="10" cy="8" r="2.2" />
          </svg>
          <strong className="font-medium">{p.city}</strong>
          <span className="text-cream/60">{p.street}</span>
        </span>
        {p.hours ? <span className="text-cream/60 hidden md:inline">{firstClause(p.hours)}</span> : null}
        <span className="flex items-center gap-2 ml-auto">
          {p.clickCollect ? <Cap>Retrait 2 h</Cap> : null}
          {p.delivery ? <Cap>Livraison {p.deliveryRadiusKm} km</Cap> : null}
          <span className="text-[10px] uppercase tracking-wider text-gold border border-gold/40 px-1.5 py-0.5">
            {tier.labelFr || tier.label}
          </span>
          <Link href="/choisir-ma-cave" className="underline underline-offset-2 text-cream/80 hover:text-cream">
            Changer
          </Link>
          <span className="text-cream/25" aria-hidden>|</span>
          <ManageLink className="text-cream/60 hover:text-cream" />
        </span>
      </div>
    </div>
  );
}

const Cap = ({ children }: { children: React.ReactNode }) => (
  <span className="text-[11px] bg-cream/10 px-2 py-0.5">{children}</span>
);

/** Small back-office entry point. Kept out of the main nav so it never competes with shopping. */
const ManageLink = ({ className }: { className?: string }) => (
  <Link
    href="/manage/login"
    title="Back-office caviste"
    className={`flex items-center gap-1.5 whitespace-nowrap text-xs ${className ?? ''}`}
  >
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="1.5" /><path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
    Espace caviste
  </Link>
);
