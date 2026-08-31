'use server';
import { redirect } from 'next/navigation';
import { setSelectedStore } from '@/lib/store-selection';
import { storeByKey } from '@/lib/ct/stores';

export async function chooseStore(formData: FormData) {
  const key = String(formData.get('storeKey') ?? '');
  const store = await storeByKey(key);
  // Guard server-side: a DRAFT or off-boarded store must not become shoppable by posting its key.
  if (!store || store.programme.lifecycleState !== 'ACTIVE') redirect('/choisir-ma-cave?error=indisponible');
  await setSelectedStore(key);
  redirect('/');
}
