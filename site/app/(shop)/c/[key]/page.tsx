import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { ProductListing } from '@/components/ProductListing';
import { readQuery } from '@/lib/query';
import { categoryByKey } from '@/lib/ct/categories';
import { getStoreContextOrNull } from '@/lib/session';
import { localized } from '@/lib/format';
import { DISPLAY_LOCALE } from '@/lib/constants';

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  const cat = await categoryByKey(key);
  return { title: cat ? localized(cat.name as Record<string, string>, DISPLAY_LOCALE) : 'Catégorie' };
}

export default async function CategoryPage({
  params, searchParams,
}: { params: Promise<{ key: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await getStoreContextOrNull();
  if (!ctx) redirect('/choisir-ma-cave');
  const { key } = await params;
  const cat = await categoryByKey(key);
  if (!cat) notFound();
  const query = readQuery(await searchParams);
  const label = localized(cat.name as Record<string, string>, DISPLAY_LOCALE);

  return (
    <ProductListing
      title={label}
      intro={`${label} chez ${ctx.store.name}.`}
      base={`/c/${key}`}
      query={query}
      categoryId={cat.id}
    />
  );
}
