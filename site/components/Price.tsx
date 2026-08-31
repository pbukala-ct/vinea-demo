import { money } from '@/lib/format';

/** Price with an optional strikethrough reference price (the `price-promo` was_price field). */
export function Price({ value, wasPrice, size = 'md' }: { value?: number; wasPrice?: number; size?: 'sm' | 'md' | 'lg' }) {
  const scale = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-sm' : 'text-lg';
  if (value == null) return <span className="text-muted text-sm">Prix sur demande</span>;
  return (
    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className={`${scale} font-medium ${wasPrice ? 'text-bordeaux' : 'text-ink'}`}>{money(value)}</span>
      {wasPrice ? (
        <>
          <s className="text-muted text-sm">{money(wasPrice)}</s>
          <span className="text-[10px] font-semibold uppercase tracking-wider bg-bordeaux text-white px-1.5 py-0.5">
            −{Math.round(((wasPrice - value) / wasPrice) * 100)}%
          </span>
        </>
      ) : null}
    </span>
  );
}
