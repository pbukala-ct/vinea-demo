import Image from 'next/image';
import Link from 'next/link';
import type { AppProduct } from '@/lib/mappers/product';
import { Price } from './Price';
import { StockBadge } from './StockBadge';

export function ProductCard({ product }: { product: AppProduct }) {
  const v = product.variant;
  const a = v.attributes;
  const meta = [a.producer, a.region ?? a.country].filter(Boolean).join(' · ');
  const spec = [a.vintage_text ?? a.vintage, a.volume_ml ? `${a.volume_ml} ml` : null, a.abv ? `${a.abv}%` : null]
    .filter(Boolean).join(' · ');

  return (
    <Link
      href={`/produit/${product.slug}`}
      className="group flex flex-col bg-surface border border-line hover:border-bordeaux/40 transition-colors"
    >
      <div className="relative aspect-square bg-cream-deep overflow-hidden">
        {v.image ? (
          <Image
            src={v.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-contain p-4 mix-blend-multiply group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted text-xs">Sans visuel</div>
        )}
        {a.organic === true ? (
          <span className="absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wider bg-sage text-white px-1.5 py-0.5">
            Bio
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5 p-4 flex-1">
        {meta ? <p className="eyebrow truncate">{meta}</p> : null}
        <h3 className="text-base leading-snug line-clamp-2 group-hover:text-bordeaux transition-colors">
          {product.name}
        </h3>
        {spec ? <p className="text-xs text-muted">{spec}</p> : null}
        <div className="mt-auto pt-3 flex items-end justify-between gap-2">
          <Price value={v.price} wasPrice={v.wasPrice} />
          <StockBadge onStock={v.onStock} quantity={v.quantity} />
        </div>
      </div>
    </Link>
  );
}
