import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { requireManageContext } from '@/lib/manage/session';
import { browseCatalogue } from '@/lib/ct/manage/selection';
import { Panel, TierLocked } from '@/components/manage/ui';
import { RangeToggle } from '@/components/manage/RangeToggle';
import { readQuery, buildHref } from '@/lib/query';
import { money } from '@/lib/format';
import { FRANCHISOR } from '@/lib/constants';

export const metadata: Metadata = { title: 'Ma gamme' };

export default async function ManageRange({
  searchParams,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requireManageContext();

  if (!ctx.tier.features.assortmentControl) {
    return (
      <TierLocked
        capability="Gestion de votre gamme"
        tierLabel={ctx.tier.labelFr || ctx.tier.label}
        explain={`La gamme de votre cave est actuellement définie par ${FRANCHISOR}. À partir du palier Connecté, vous choisissez vous-même les références que vous souhaitez proposer, parmi tout le catalogue du réseau.`}
      />
    );
  }

  const query = readQuery(await searchParams);
  const result = await browseCatalogue(ctx.store, {
    page: query.page ? Number(query.page) : 1,
    q: query.q,
    rangedOnly: query.vue === 'gamme',
  });

  const ceiling = ctx.tier.rangeCeiling;
  const atCeiling = ceiling !== null && result.rangedCount >= ceiling;
  const pct = ceiling ? Math.min(100, (result.rangedCount / ceiling) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl">Ma gamme</h1>
          <p className="text-sm text-muted mt-1">
            Choisissez ce que votre cave propose, parmi le catalogue {FRANCHISOR}.
          </p>
        </div>
        <div className="text-right" data-testid="range-gauge" data-ranged={result.rangedCount} data-ceiling={ceiling ?? 'unlimited'}>
          <p className="font-display text-2xl tabular-nums">
            {result.rangedCount}
            <span className="text-muted text-base"> / {ceiling ?? '∞'}</span>
          </p>
          <p className="text-xs text-muted">références en gamme</p>
        </div>
      </div>

      {ceiling !== null ? (
        <div>
          <div className="h-1.5 bg-line overflow-hidden">
            <div className={`h-full ${atCeiling ? 'bg-bordeaux' : 'bg-sage'}`} style={{ width: `${pct}%` }} />
          </div>
          {atCeiling ? (
            <p className="mt-2 text-sm text-bordeaux">
              Plafond du palier {ctx.tier.labelFr} atteint. Retirez une référence pour en ajouter une
              autre, ou <Link href="/devenir-caviste" className="underline underline-offset-2">passez au palier supérieur</Link>.
            </p>
          ) : null}
        </div>
      ) : null}

      <form className="flex flex-wrap gap-2" action="/manage/gamme">
        <input
          name="q" defaultValue={query.q ?? ''} placeholder="Chercher une référence, un domaine…"
          className="flex-1 min-w-[220px] border border-line bg-surface px-3 py-2.5 text-sm"
        />
        {query.vue ? <input type="hidden" name="vue" value={query.vue} /> : null}
        <button className="bg-ink text-cream px-4 py-2.5 text-sm">Chercher</button>
      </form>

      <div className="flex gap-1.5">
        {[{ v: '', l: 'Tout le catalogue' }, { v: 'gamme', l: 'Ma gamme seulement' }].map((t) => {
          const on = (query.vue ?? '') === t.v;
          return (
            <Link
              key={t.l}
              href={buildHref('/manage/gamme', query, { vue: t.v || undefined })}
              className={`text-sm px-3 py-2 border ${on ? 'bg-ink text-cream border-ink' : 'border-line bg-surface hover:border-bordeaux'}`}
            >
              {t.l}
            </Link>
          );
        })}
      </div>

      <p className="text-xs text-muted">
        Vos ajouts et retraits sont enregistrés immédiatement. L’affichage sur la vitrine passe par
        l’index de recherche du catalogue et peut prendre jusqu’à une minute.
      </p>

      <Panel title={`${result.total} référence${result.total === 1 ? '' : 's'}`} subtitle="Ajouter une référence la met en vente sur votre vitrine — comptez environ une minute">
        <ul className="divide-y divide-line">
          {result.products.map((p) => (
            <li key={p.id} className="flex items-center gap-4 px-5 py-3">
              <div className="relative w-10 h-12 shrink-0 bg-cream-deep">
                {p.variant.image ? (
                  <Image src={p.variant.image} alt="" fill sizes="40px" className="object-contain p-1 mix-blend-multiply" />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{p.name}</p>
                <p className="text-xs text-muted">
                  {[p.variant.attributes.producer, p.variant.attributes.country].filter(Boolean).join(' · ')} · Réf. {p.variant.sku}
                </p>
              </div>
              <p className="text-sm tabular-nums w-20 text-right shrink-0">
                {p.variant.price != null ? money(p.variant.price) : '—'}
              </p>
              <div className="shrink-0 w-32 flex justify-end">
                <RangeToggle productId={p.id} ranged={p.ranged} atCeiling={atCeiling} />
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      {result.pages > 1 ? (
        <div className="flex justify-center gap-2 flex-wrap">
          {Array.from({ length: Math.min(result.pages, 12) }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={buildHref('/manage/gamme', query, { page: String(n) })}
              className={`px-3.5 py-2 text-sm border tabular-nums ${n === result.page ? 'bg-ink text-cream border-ink' : 'border-line bg-surface hover:border-bordeaux'}`}
            >
              {n}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
