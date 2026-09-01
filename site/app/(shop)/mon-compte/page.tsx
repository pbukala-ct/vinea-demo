import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getShopperSession } from '@/lib/auth/session';
import { customerById, customerOrders } from '@/lib/ct/customer';
import { allStores } from '@/lib/ct/stores';
import { LogoutButton } from '@/components/LogoutButton';
import { money } from '@/lib/format';

export const metadata: Metadata = { title: 'Mon compte' };

const STATE_FR: Record<string, string> = {
  Open: 'À traiter', Confirmed: 'Confirmée', Complete: 'Terminée', Cancelled: 'Annulée',
};

export default async function MonCompte() {
  const session = await getShopperSession();
  if (!session) redirect('/connexion');

  const [customer, orders, stores] = await Promise.all([
    customerById(session.customerId),
    customerOrders(session.customerId),
    allStores(),
  ]);
  if (!customer) redirect('/connexion');

  const cityOf = (key?: string) => stores.find((s) => s.key === key)?.programme.city ?? '—';
  const caves = [...new Set(orders.map((o) => o.storeKey).filter(Boolean))];
  const spend = orders.filter((o) => o.state !== 'Cancelled').reduce((n, o) => n + o.total, 0);
  const addr = customer.addresses?.[0];

  return (
    <div className="mx-auto max-w-[1240px] px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Mon compte</p>
          <h1 className="text-4xl mt-1">Bonjour {customer.firstName}</h1>
          <p className="mt-2 text-sm text-muted">{customer.email}</p>
        </div>
        <LogoutButton className="text-sm text-muted underline underline-offset-2 hover:text-bordeaux" />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Commandes" value={String(orders.length)} />
        <Stat label="Caves visitées" value={String(caves.length)} hint={caves.map(cityOf).join(' · ')} />
        <Stat label="Total dépensé" value={money(spend)} />
      </div>

      <div className="mt-10 grid lg:grid-cols-[1fr_300px] gap-10 items-start">
        <section>
          <h2 className="font-display text-2xl">Mes commandes</h2>
          <p className="text-sm text-muted mt-1">
            Toutes vos commandes, dans toutes les caves du réseau.
          </p>
          {orders.length === 0 ? (
            <p className="mt-6 bg-surface border border-line p-6 text-sm text-muted">
              Aucune commande pour l’instant.
            </p>
          ) : (
            <ul className="mt-5 space-y-3">
              {orders.map((o) => (
                <li key={o.id} className="bg-surface border border-line p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="font-medium">{o.orderNumber ?? o.id.slice(0, 8)}</p>
                    <p className="text-sm tabular-nums">{money(o.total)}</p>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    {(o.createdAt ?? '').slice(0, 10)} · Cave de <strong className="text-ink-soft">{cityOf(o.storeKey)}</strong>
                    {o.state ? ` · ${STATE_FR[o.state] ?? o.state}` : ''}
                  </p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {o.lines.slice(0, 6).map((l, i) => (
                      <li key={i} className="relative w-10 h-12 bg-cream-deep" title={`${l.quantity} × ${l.name}`}>
                        {l.image ? (
                          <Image src={l.image} alt={l.name} fill sizes="40px" className="object-contain p-1 mix-blend-multiply" />
                        ) : null}
                      </li>
                    ))}
                    {o.lines.length > 6 ? (
                      <li className="w-10 h-12 grid place-items-center text-xs text-muted">+{o.lines.length - 6}</li>
                    ) : null}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="bg-surface border border-line p-6">
          <h2 className="eyebrow">Mes coordonnées</h2>
          {addr ? (
            <address className="mt-3 not-italic text-sm text-ink-soft leading-relaxed">
              {addr.firstName} {addr.lastName}<br />
              {addr.streetName}<br />
              {addr.postalCode} {addr.city}<br />
              {addr.phone ? <span className="text-muted">{addr.phone}</span> : null}
            </address>
          ) : (
            <p className="mt-3 text-sm text-muted">Aucune adresse enregistrée.</p>
          )}
          <p className="mt-5 pt-4 rule text-xs text-muted leading-relaxed">
            Un compte, tout le réseau : vos commandes sont regroupées ici même lorsque vous changez
            de cave.
          </p>
          <Link href="/catalogue" className="mt-4 block text-center border border-line py-3 text-sm hover:border-bordeaux">
            Retourner à la cave
          </Link>
        </aside>
      </div>
    </div>
  );
}

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="bg-surface border border-line p-5">
    <p className="eyebrow">{label}</p>
    <p className="font-display text-3xl mt-1.5 tabular-nums">{value}</p>
    {hint ? <p className="text-xs text-muted mt-1">{hint}</p> : null}
  </div>
);
