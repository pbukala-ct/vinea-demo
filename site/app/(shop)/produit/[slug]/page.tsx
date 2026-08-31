import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { productBySlug, relatedProducts } from '@/lib/ct/search';
import { getStoreContextOrNull } from '@/lib/session';
import { categoryById } from '@/lib/ct/categories';
import { localized } from '@/lib/format';
import { DISPLAY_LOCALE } from '@/lib/constants';
import { Price } from '@/components/Price';
import { StockBadge } from '@/components/StockBadge';
import { AddToCart } from '@/components/AddToCart';
import { ProductCard } from '@/components/ProductCard';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await productBySlug(slug);
  return { title: p?.name ?? 'Produit' };
}

/** Attribute rows, in the order a caviste would describe a bottle. */
const SPEC_ORDER: [string, string, ((v: unknown) => string)?][] = [
  ['producer', 'Domaine / marque'],
  ['appellation', 'Appellation'],
  ['region', 'Région'],
  ['country', 'Pays'],
  ['varietal', 'Cépage'],
  ['vintage_text', 'Millésime'],
  ['sweetness', 'Sucrosité'],
  ['abv', 'Degré', (v) => `${v} % vol.`],
  ['volume_ml', 'Volume', (v) => `${v} ml`],
  ['format', 'Format'],
  ['pack_size', 'Nombre par lot'],
  ['alcohol_units', 'Unités d’alcool', (v) => String(v)],
  ['gtin', 'Code-barres'],
];

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await getStoreContextOrNull();
  if (!ctx) redirect('/choisir-ma-cave');
  const { slug } = await params;
  const product = await productBySlug(slug);
  if (!product) notFound();

  const [related, cat] = await Promise.all([
    relatedProducts(product),
    product.categoryIds[0] ? categoryById(product.categoryIds[0]) : Promise.resolve(null),
  ]);
  const v = product.variant;
  const a = v.attributes;
  const p = ctx.store.programme;

  const specs = SPEC_ORDER
    .filter(([k]) => a[k] !== undefined && a[k] !== null && a[k] !== '')
    .map(([k, label, fmt]) => [label, fmt ? fmt(a[k]) : String(a[k])] as [string, string]);

  return (
    <>
      <div className="mx-auto max-w-[1240px] px-5 pt-6">
        <nav aria-label="Fil d’Ariane" className="text-xs text-muted flex items-center gap-2">
          <Link href="/catalogue" className="hover:text-bordeaux">La cave</Link>
          {cat ? (
            <>
              <span aria-hidden>/</span>
              <Link href={`/c/${cat.key}`} className="hover:text-bordeaux">
                {localized(cat.name as Record<string, string>, DISPLAY_LOCALE)}
              </Link>
            </>
          ) : null}
        </nav>
      </div>

      <div className="mx-auto max-w-[1240px] px-5 py-8 grid md:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] gap-10 lg:gap-14">
        <div className="relative aspect-square bg-surface border border-line">
          {v.image ? (
            <Image src={v.image} alt={product.name} fill sizes="(max-width: 768px) 100vw, 560px"
              className="object-contain p-10 mix-blend-multiply" priority />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-muted text-sm">Sans visuel</div>
          )}
          {a.organic === true ? (
            <span className="absolute top-4 left-4 text-[10px] font-semibold uppercase tracking-wider bg-sage text-white px-2 py-1">
              Agriculture biologique
            </span>
          ) : null}
        </div>

        <div>
          {a.producer ? <p className="eyebrow">{String(a.producer)}</p> : null}
          <h1 className="text-4xl mt-2 leading-tight">{product.name}</h1>

          <div className="mt-5 flex flex-col gap-2">
            <Price value={v.price} wasPrice={v.wasPrice} size="lg" />
            <StockBadge onStock={v.onStock} quantity={v.quantity} />
          </div>
          <p className="mt-1.5 text-xs text-muted">
            Prix TTC à {p.city} · TVA 20 % incluse
            {v.promoId ? ` · offre ${v.promoId}` : ''}
          </p>

          <div className="mt-7">
            <AddToCart sku={v.sku} onStock={v.onStock} max={v.quantity} />
          </div>

          <div className="mt-6 border border-line bg-surface p-4 text-sm">
            <p className="font-medium">Retrait &amp; livraison</p>
            <ul className="mt-2 space-y-1 text-ink-soft">
              {p.clickCollect ? <li>Retrait chez {ctx.store.name} en 2 heures</li> : null}
              {p.delivery ? <li>Livraison à domicile sous {p.deliveryRadiusKm} km</li> : null}
              {!p.clickCollect && !p.delivery ? (
                <li className="text-muted">
                  Cette cave ne propose pas encore le retrait en ligne — commandez et retirez sur place.
                </li>
              ) : null}
            </ul>
          </div>

          {product.description ? (
            <div className="mt-8">
              <h2 className="eyebrow">Le mot du caviste</h2>
              <p className="mt-2 text-ink-soft leading-relaxed">{product.description}</p>
            </div>
          ) : null}

          {specs.length ? (
            <div className="mt-8">
              <h2 className="eyebrow">Fiche technique</h2>
              <dl className="mt-3 divide-y divide-line border-t border-line">
                {specs.map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-6 py-2.5 text-sm">
                    <dt className="text-muted">{label}</dt>
                    <dd className="text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </div>
      </div>

      {related.length ? (
        <section className="bg-cream-deep py-14 mt-6">
          <div className="mx-auto max-w-[1240px] px-5">
            <p className="eyebrow">Dans la même famille</p>
            <h2 className="text-3xl mt-1">À découvrir aussi</h2>
            <ul className="mt-7 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
              {related.map((r) => <li key={r.id}><ProductCard product={r} /></li>)}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}
