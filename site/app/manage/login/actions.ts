'use server';
import { redirect } from 'next/navigation';
import { storeByKey } from '@/lib/ct/stores';
import { createManageToken, setManageCookie, clearManageCookie } from '@/lib/manage/session';

export async function signIn(formData: FormData) {
  const storeKey = String(formData.get('storeKey') ?? '');
  const store = await storeByKey(storeKey);
  // a DRAFT / off-boarded cave has no back office to sign into
  if (!store || store.programme.lifecycleState !== 'ACTIVE') redirect('/manage/login?error=indisponible');
  const token = await createManageToken({
    storeKey,
    storeName: store.name,
    city: store.programme.city ?? '',
    adminName: 'Responsable de cave',
  });
  await setManageCookie(token);
  redirect('/manage');
}

export async function signOut() {
  await clearManageCookie();
  redirect('/manage/login');
}
