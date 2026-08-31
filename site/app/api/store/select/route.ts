import { NextResponse } from 'next/server';
import { setSelectedStore, clearSelectedStore } from '@/lib/store-selection';
import { storeByKey } from '@/lib/ct/stores';

export async function POST(req: Request) {
  const { storeKey } = await req.json().catch(() => ({}));
  if (typeof storeKey !== 'string') return NextResponse.json({ error: 'bad_key' }, { status: 400 });
  const store = await storeByKey(storeKey);
  if (!store || store.programme.lifecycleState !== 'ACTIVE') {
    return NextResponse.json({ error: 'not_trading' }, { status: 409 });
  }
  await setSelectedStore(storeKey);
  return NextResponse.json({ ok: true, storeKey });
}

export async function DELETE() {
  await clearSelectedStore();
  return NextResponse.json({ ok: true });
}
