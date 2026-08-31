import type { ProductProjection, ProductVariant, Price, Attribute } from '@commercetools/platform-sdk';
import { localized } from '@/lib/format';
import { DISPLAY_LOCALE } from '@/lib/constants';

export interface AppVariant {
  id: number;
  sku: string;
  image?: string;
  /** effective price in minor units (after any product discount) */
  price?: number;
  /** reference "was" price from the price-promo custom field, when on promotion */
  wasPrice?: number;
  promoId?: string;
  attributes: Record<string, unknown>;
  onStock: boolean;
  quantity: number;
}

export interface AppProduct {
  id: string;
  key: string;
  name: string;
  slug: string;
  description?: string;
  categoryIds: string[];
  variant: AppVariant;
}

/** enum attributes arrive as { key, label } — surface the label, it is what the UI shows. */
function attrs(list: Attribute[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const a of list) {
    const v = a.value as unknown;
    out[a.name] = v && typeof v === 'object' && 'label' in (v as object) ? (v as { label: unknown }).label : v;
  }
  return out;
}

function mapVariant(v: ProductVariant, supplyChannelId?: string): AppVariant {
  const p: Price | undefined = v.price;
  const chan = supplyChannelId ? v.availability?.channels?.[supplyChannelId] : undefined;
  const avail = chan ?? v.availability;
  const was = (p?.custom?.fields?.was_price as { centAmount?: number } | undefined)?.centAmount;
  const effective = (p?.discounted?.value ?? p?.value)?.centAmount;
  return {
    id: v.id,
    sku: v.sku ?? '',
    image: v.images?.[0]?.url,
    price: effective,
    // only a was-price ABOVE the current price is a saving worth showing
    wasPrice: was && effective && was > effective ? was : undefined,
    promoId: p?.custom?.fields?.promo_id as string | undefined,
    attributes: attrs(v.attributes),
    onStock: avail?.isOnStock ?? false,
    quantity: avail?.availableQuantity ?? 0,
  };
}

export function mapProduct(p: ProductProjection, supplyChannelId?: string): AppProduct {
  return {
    id: p.id,
    key: p.key ?? p.masterVariant.sku ?? p.id,
    name: localized(p.name as Record<string, string>, DISPLAY_LOCALE),
    slug: localized(p.slug as Record<string, string>, DISPLAY_LOCALE),
    description: p.description ? localized(p.description as Record<string, string>, DISPLAY_LOCALE) : undefined,
    categoryIds: (p.categories ?? []).map((c) => c.id),
    variant: mapVariant(p.masterVariant, supplyChannelId),
  };
}
