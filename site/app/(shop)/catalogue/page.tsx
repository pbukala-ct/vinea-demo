import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ProductListing } from '@/components/ProductListing';
import { readQuery } from '@/lib/query';
import { getStoreContextOrNull } from '@/lib/session';

export const metadata: Metadata = { title: 'La cave' };

export default async function Catalogue({
  searchParams,
}: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await getStoreContextOrNull();
  if (!ctx) redirect('/choisir-ma-cave');
  const query = readQuery(await searchParams);

  const searching = !!query.q && ctx.tier.features.productSearch;
  return (
    <ProductListing
      title={searching ? `« ${query.q} »` : 'Toute la cave'}
      intro={
        searching
          ? `Résultats dans la cave de ${ctx.store.programme.city}.`
          : `Ce que ${ctx.store.name} range aujourd’hui, aux prix de cette cave.`
      }
      base="/catalogue"
      query={query}
    />
  );
}
